package middleware

import (
	"net"
	"strings"
)

// Platform subdomains that belong to the application itself and must never be
// interpreted as a tenant slug.
var reservedSubdomains = map[string]bool{
	"app":   true,
	"api":   true,
	"www":   true,
	"admin": true,
	"auth":  true,
	"mail":  true,
}

// NormalizeHost normalizes a Host header value for tenant resolution: lowercases,
// strips the port, and removes a trailing dot. It never trusts forwarding headers;
// only the actual Host header is used.
//
// Examples:
//
//	"RT-003.OpenRT.Local:8080." -> "rt-003.openrt.local"
//	"localhost:3000"            -> "localhost"
//	"[::1]:8081"                -> "::1"
func NormalizeHost(host string) string {
	host = strings.ToLower(strings.TrimSpace(host))
	host = strings.TrimSuffix(host, ".")
	if h, _, err := net.SplitHostPort(host); err == nil {
		return h
	}
	// IPv6 literal without port, e.g. "[::1]"
	if strings.HasPrefix(host, "[") && strings.HasSuffix(host, "]") {
		return strings.Trim(host, "[]")
	}
	return host
}

// HostnameSlug returns the tenant slug encoded in the hostname when the host is a
// tenant subdomain of baseDomain (e.g. host "rt-003.openrt.local" with baseDomain
// "openrt.local" -> ("rt-003", true)).
//
// matched is false when the host is a platform host (the base domain itself,
// localhost / loopback addresses, reserved subdomains such as app/api/www, or
// empty) or when the host does not belong to baseDomain (including attacker-style
// hosts like "rt-003.attacker.com" or "rt-003.openrt.local.attacker.com", which
// are NOT base-domain subdomains and therefore never yield a tenant slug).
func HostnameSlug(host, baseDomain string) (string, bool) {
	host = NormalizeHost(host)
	baseDomain = strings.ToLower(strings.TrimSpace(strings.TrimSuffix(baseDomain, ".")))
	if host == "" || baseDomain == "" {
		return "", false
	}
	if host == baseDomain {
		return "", false
	}
	suffix := "." + baseDomain
	if !strings.HasSuffix(host, suffix) {
		return "", false
	}
	sub := strings.TrimSuffix(host, suffix)
	if sub == "" || reservedSubdomains[sub] {
		return "", false
	}
	if !isValidTenantSlug(sub) {
		return "", false
	}
	return sub, true
}

// isValidTenantSlug validates a subdomain-derived tenant slug: lowercase
// alphanumerics with internal hyphens only. It is intentionally strict so an
// arbitrary Host header can never be turned directly into a schema name or a
// lookup key without passing through the tenants table first.
func isValidTenantSlug(slug string) bool {
	if slug == "" || len(slug) > 63 {
		return false
	}
	for i, r := range slug {
		switch {
		case r >= 'a' && r <= 'z', r >= '0' && r <= '9':
		case r == '-' && i > 0 && i < len(slug)-1:
		default:
			return false
		}
	}
	return true
}

// IsPlatformHost reports whether the normalized host is the platform host itself
// (loopback, the base domain, or a reserved subdomain of the base domain). On
// these hosts the backend derives the tenant from the JWT only.
func IsPlatformHost(host, baseDomain string) bool {
	host = NormalizeHost(host)
	baseDomain = strings.ToLower(strings.TrimSpace(strings.TrimSuffix(baseDomain, ".")))
	switch host {
	case "", "localhost", "127.0.0.1", "::1", baseDomain:
		return true
	}
	// Reserved subdomains of the base domain (app.openrt.local, api.openrt.local).
	if baseDomain != "" && strings.HasSuffix(host, "."+baseDomain) {
		sub := strings.TrimSuffix(host, "."+baseDomain)
		if reservedSubdomains[sub] {
			return true
		}
	}
	return false
}
