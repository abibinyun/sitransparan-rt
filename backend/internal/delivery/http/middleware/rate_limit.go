package middleware

import (
	"log"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"
)

// tokenBucket is the per-client token bucket state.
type tokenBucket struct {
	tokens     float64
	capacity   float64
	refillRate float64 // tokens per second
	lastRefill time.Time
	lastSeen   time.Time
}

// IPRateLimiter rate-limits per client IP. Every distinct source address gets
// its own token bucket, so one abusive client (authenticated or not) can only
// exhaust its own budget — it can never 429 the whole API for everyone else,
// which was possible with the previous single global bucket.
//
// Client identity:
//   - The request's direct peer (r.RemoteAddr) is always the fallback key.
//   - X-Forwarded-For is honored ONLY when the direct peer is a trusted proxy
//     (configured via TRUSTED_PROXY_IPS). From any other peer the header is
//     ignored, so an attacker cannot spoof a fresh identity to dodge the limit.
//   - When a trusted proxy forwards the request, the leftmost X-Forwarded-For
//     entry that is not itself a trusted proxy is used (the original client).
//
// Memory is bounded: a lazy sweep removes buckets idle for longer than
// idleTimeout, and an eviction caps the map at maxEntries.
type IPRateLimiter struct {
	mu            sync.Mutex
	buckets       map[string]*tokenBucket
	capacity      float64
	refillRate    float64
	trusted       ipMatcher
	maxEntries    int
	idleTimeout   time.Duration
	sweepEvery    int
	opsSinceSweep int
}

// ipMatcher matches trusted proxy peers by exact IP or CIDR. CIDR is useful in
// Docker/Traefik deployments where the proxy's container IP changes on every
// recreate but stays inside the same docker network subnet.
type ipMatcher struct {
	exact map[string]struct{}
	cidrs []*net.IPNet
}

func newIPMatcher(entries []string) ipMatcher {
	m := ipMatcher{exact: make(map[string]struct{})}
	for _, e := range entries {
		e = strings.TrimSpace(e)
		if e == "" {
			continue
		}
		if strings.Contains(e, "/") {
			if _, ipnet, err := net.ParseCIDR(e); err == nil {
				m.cidrs = append(m.cidrs, ipnet)
			} else {
				log.Printf("warning: TRUSTED_PROXY_IPS entry %q is not a valid CIDR, ignoring", e)
			}
			continue
		}
		m.exact[e] = struct{}{}
	}
	return m
}

func (m ipMatcher) matches(ip string) bool {
	if _, ok := m.exact[ip]; ok {
		return true
	}
	parsed := net.ParseIP(ip)
	if parsed == nil {
		return false
	}
	for _, c := range m.cidrs {
		if c.Contains(parsed) {
			return true
		}
	}
	return false
}

// NewIPRateLimiter creates a per-IP token bucket limiter. trustedProxies lists
// reverse proxies in front of the backend (exact IP or CIDR); requests whose
// direct peer matches may carry a real client IP in X-Forwarded-For.
func NewIPRateLimiter(capacity int, refillRate float64, trustedProxies []string) *IPRateLimiter {
	return &IPRateLimiter{
		buckets:     make(map[string]*tokenBucket),
		capacity:    float64(capacity),
		refillRate:  refillRate,
		trusted:     newIPMatcher(trustedProxies),
		maxEntries:  10000,
		idleTimeout: 2 * time.Minute,
		sweepEvery:  256,
	}
}

// peerIP extracts the host from a RemoteAddr like "1.2.3.4:5678" or "[::1]:80".
func peerIP(remoteAddr string) string {
	if host, _, err := net.SplitHostPort(remoteAddr); err == nil {
		return host
	}
	return remoteAddr
}

// clientKey returns the identity used for rate limiting.
func (rl *IPRateLimiter) clientKey(r *http.Request) string {
	peer := peerIP(r.RemoteAddr)
	if !rl.trusted.matches(peer) {
		// Untrusted direct peer: never trust X-Forwarded-For.
		return peer
	}
	// Trusted proxy: pick the original client from X-Forwarded-For, skipping
	// any entries that are themselves trusted proxies. Falls back to the peer
	// when the header is absent or only contains trusted IPs.
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		parts := strings.Split(xff, ",")
		for i := len(parts) - 1; i >= 0; i-- {
			ip := strings.TrimSpace(parts[i])
			if ip == "" {
				continue
			}
			if rl.trusted.matches(ip) {
				continue
			}
			return ip
		}
	}
	return peer
}

// evictLocked removes one bucket when the map is at capacity. Go map iteration
// order is randomized, so taking the first key is effectively random eviction
// and stays O(1) under adversarial churn (an O(n) oldest-scan would be a CPU
// amplification edge).
func (rl *IPRateLimiter) evictLocked() {
	for k := range rl.buckets {
		delete(rl.buckets, k)
		return
	}
}

func (rl *IPRateLimiter) sweepLocked(now time.Time) {
	for k, b := range rl.buckets {
		if now.Sub(b.lastSeen) > rl.idleTimeout {
			delete(rl.buckets, k)
		}
	}
}

// allow consumes one token from the bucket for key. A new key starts with a
// full bucket so the first request is always allowed.
func (rl *IPRateLimiter) allow(key string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	b, ok := rl.buckets[key]
	if !ok {
		if len(rl.buckets) >= rl.maxEntries {
			rl.evictLocked()
		}
		b = &tokenBucket{
			tokens:     rl.capacity,
			capacity:   rl.capacity,
			refillRate: rl.refillRate,
			lastRefill: now,
			lastSeen:   now,
		}
		rl.buckets[key] = b
	}
	b.lastSeen = now

	elapsed := now.Sub(b.lastRefill).Seconds()
	b.lastRefill = now
	b.tokens += elapsed * b.refillRate
	if b.tokens > b.capacity {
		b.tokens = b.capacity
	}

	rl.opsSinceSweep++
	if rl.opsSinceSweep >= rl.sweepEvery {
		rl.opsSinceSweep = 0
		rl.sweepLocked(now)
	}

	if b.tokens >= 1 {
		b.tokens--
		return true
	}
	return false
}

// isExempt reports whether a path is never rate limited. Health probes must
// keep working even under attack, and the OpenAPI spec is a static asset.
func isExempt(path string) bool {
	return path == "/health" || strings.HasPrefix(path, "/swagger/")
}

// Middleware wraps a handler with the per-IP rate limiter.
func (rl *IPRateLimiter) Middleware() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if isExempt(r.URL.Path) || rl.allow(rl.clientKey(r)) {
				next.ServeHTTP(w, r)
				return
			}
			w.Header().Set("Retry-After", "1")
			http.Error(w, `{"error":"too many requests"}`, http.StatusTooManyRequests)
		})
	}
}

// RateLimitMiddleware applies a per-client-IP token bucket rate limiter to HTTP
// endpoints. It is kept for compatibility and tests; main.go should use
// NewIPRateLimiter directly to configure trusted proxies.
func RateLimitMiddleware(capacity int, refillRate float64) func(http.Handler) http.Handler {
	return NewIPRateLimiter(capacity, refillRate, nil).Middleware()
}
