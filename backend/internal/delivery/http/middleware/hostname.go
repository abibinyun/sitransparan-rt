package middleware

import (
	"net"
	"strings"
)

// Platform subdomains that belong to the application itself and must never be
// interpreted as a tenant slug.
var reservedSubdomains = map[string]bool{
	"app":     true,
	"api":     true,
	"www":     true,
	"admin":   true,
	"auth":    true,
	"mail":    true,
	"staging": true,
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

var secondLevelTLDs = map[string]bool{
	"web.id": true,
	"co.id":  true,
	"ac.id":  true,
	"or.id":  true,
	"go.id":  true,
	"sch.id": true,
	"mil.id": true,
	"biz.id": true,
	"my.id":  true,
	"co.uk":  true,
	"org.uk": true,
	"me.uk":  true,
	"com.au": true,
	"net.au": true,
	"org.au": true,
	"co.jp":  true,
	"ne.jp":  true,
}

// splitBaseDomains parses a comma- or whitespace-separated list of base domains.
// It also ensures default/standard domains (openrt.local, iscube.web.id) are checked.
func splitBaseDomains(raw string) []string {
	var result []string
	seen := make(map[string]bool)

	add := func(val string) {
		norm := strings.ToLower(strings.TrimSpace(strings.TrimSuffix(val, ".")))
		if norm != "" && !seen[norm] {
			seen[norm] = true
			result = append(result, norm)
		}
	}

	if raw != "" {
		parts := strings.FieldsFunc(raw, func(r rune) bool {
			return r == ',' || r == ';' || r == ' ' || r == '\t'
		})
		for _, p := range parts {
			add(p)
		}
	}

	// Always ensure known environment, staging, or dev base domains are in the list
	add("openrt.local")
	add("iscube.web.id")
	add("cube.my.id")

	return result
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
	if host == "" {
		return "", false
	}

	for _, base := range splitBaseDomains(baseDomain) {
		if host == base {
			continue
		}
		suffix := "." + base
		if strings.HasSuffix(host, suffix) {
			sub := strings.TrimSuffix(host, suffix)
			if sub == "" || reservedSubdomains[sub] {
				return "", false
			}
			// Strip optional staging suffix (e.g. "rt-003-staging" -> "rt-003")
			slug := strings.TrimSuffix(sub, "-staging")
			if isValidTenantSlug(slug) {
				return slug, true
			}
			return "", false
		}
	}

	return "", false
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
	switch host {
	case "", "localhost", "127.0.0.1", "::1":
		return true
	}
	for _, base := range splitBaseDomains(baseDomain) {
		if host == base {
			return true
		}
		// Reserved subdomains of the base domain (app.openrt.local, api.openrt.local).
		if strings.HasSuffix(host, "."+base) {
			sub := strings.TrimSuffix(host, "."+base)
			if reservedSubdomains[sub] {
				return true
			}
		}
	}

	return false
}
