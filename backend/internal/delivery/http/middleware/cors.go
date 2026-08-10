package middleware

import (
	"net"
	"net/http"
	"net/url"
	"strings"
)

// originAllowed reports whether the request Origin belongs to the application:
// a tenant subdomain of the base domain (<slug>.<baseDomain>), the base domain
// itself, or a local development origin (localhost / loopback). Any other origin
// (e.g. attacker.com) is rejected and receives NO CORS headers, so the browser
// blocks the cross-origin response. This prevents a malicious site from making
// credentialed cross-origin requests to the API.
func originAllowed(origin, baseDomain string) bool {
	if origin == "" {
		return false
	}
	u, err := url.Parse(origin)
	if err != nil || u.Host == "" {
		return false
	}
	host := strings.ToLower(strings.TrimSpace(u.Host))
	// Strip an explicit port (e.g. http://localhost:3000).
	if h, _, err := net.SplitHostPort(host); err == nil {
		host = h
	}
	switch host {
	case "localhost", "127.0.0.1", "::1":
		return true
	}
	base := strings.ToLower(strings.TrimSpace(strings.TrimSuffix(baseDomain, ".")))
	if base == "" {
		return false
	}
	return host == base || strings.HasSuffix(host, "."+base)
}

// CORSMiddleware configures CORS headers for cross-origin requests. The only
// accepted origins are tenant subdomains of baseDomain, the base domain itself,
// and localhost/loopback development origins. Unlike a reflected-origin policy,
// a disallowed Origin (e.g. attacker.com) gets no Access-Control-Allow-* headers
// and the browser blocks the response.
func CORSMiddleware(baseDomain string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			if origin != "" && originAllowed(origin, baseDomain) {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Vary", "Origin")
				w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
				w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, X-Tenant-ID")
				w.Header().Set("Access-Control-Allow-Credentials", "true")
			}

			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusOK)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
