package middleware

import (
	"net/http"
	"sync"
	"time"
)

type RateLimiter struct {
	mu         sync.Mutex
	tokens     float64
	capacity   float64
	refillRate float64 // tokens per second
	lastRefill time.Time
}

func NewRateLimiter(capacity int, refillRate float64) *RateLimiter {
	return &RateLimiter{
		tokens:     float64(capacity),
		capacity:   float64(capacity),
		refillRate: refillRate,
		lastRefill: time.Now(),
	}
}

func (rl *RateLimiter) Allow() bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	elapsed := now.Sub(rl.lastRefill).Seconds()
	rl.lastRefill = now

	rl.tokens += elapsed * rl.refillRate
	if rl.tokens > rl.capacity {
		rl.tokens = rl.capacity
	}

	if rl.tokens >= 1 {
		rl.tokens -= 1
		return true
	}
	return false
}

// RateLimitMiddleware applies a token bucket rate limiter to HTTP endpoints.
func RateLimitMiddleware(capacity int, refillRate float64) func(http.Handler) http.Handler {
	limiter := NewRateLimiter(capacity, refillRate)
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if !limiter.Allow() {
				http.Error(w, `{"error":"too many requests"}`, http.StatusTooManyRequests)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
