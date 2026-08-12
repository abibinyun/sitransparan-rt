package config

import (
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"
)

type Config struct {
	Port        string
	DatabaseURL string
	DBHost      string
	DBPort      string
	DBUser      string
	DBPassword  string
	DBName      string
	DBSSLMode   string
	JWTSecret   string

	// TenantBaseDomain is the parent domain under which each tenant gets its own
	// subdomain (<slug>.<baseDomain>). Used for tenant-aware hostname routing
	// (dev: localhost/openrt.local, production: openrt.com). Configurable so no
	// production domain is hardcoded.
	TenantBaseDomain string

	// RateLimitCapacity / RateLimitRefill configure the per-client-IP token
	// bucket (default 1000 tokens, 100 tokens/s per IP). Each source IP gets its
	// own bucket, so one abusive client cannot exhaust the budget for everyone.
	RateLimitCapacity int
	RateLimitRefill   float64

	// AuthRateLimitCapacity / AuthRateLimitRefill configure a stricter
	// per-client-IP budget for the public auth endpoints (/login, /register),
	// the brute-force surface. Default 20 tokens, 5 tokens/s per IP.
	AuthRateLimitCapacity int
	AuthRateLimitRefill   float64

	// TrustedProxyIPs lists reverse proxies (exact IP or CIDR) whose forwarded
	// X-Forwarded-For header is honored for per-IP rate limiting. Leave empty
	// when the backend is only reachable through untrusted peers.
	TrustedProxyIPs []string
}

// minJWTSecretLen is the minimum accepted length for JWT_SECRET. Short or
// default secrets make token forgery trivial (anyone who reads the repo can sign
// tokens for any tenant/role), so the server refuses to start without a strong,
// deployment-specific secret.
const minJWTSecretLen = 32

// legacyDefaultJWTSecret is the old hardcoded fallback that was used when
// JWT_SECRET was unset. It is publicly known (it lives in the repository and
// its value has been disclosed in security findings), so it is rejected
// explicitly even though it is longer than minJWTSecretLen.
const legacyDefaultJWTSecret = "sitransparan-secret-key-change-in-prod"

// insecureExampleJWTSecret is the placeholder value that used to ship in
// .env.example. It is also publicly known, so accepting it would reintroduce the
// same forgery risk for deployments that copy the example file verbatim.
const insecureExampleJWTSecret = "change-me-to-a-long-random-value-at-least-32-chars"

// ResolveJWTSecret validates the JWT signing secret. It returns an error when
// JWT_SECRET is unset (after trimming), shorter than minJWTSecretLen, or equal
// to a publicly-known insecure value (the legacy default or the .env.example
// placeholder). Whitespace is trimmed before validation so a padded copy of a
// known value cannot slip through the length check. There is deliberately NO
// fallback default: a hardcoded/known secret would let an attacker forge JWTs
// for any tenant and any role (superadmin included).
func ResolveJWTSecret(raw string) (string, error) {
	secret := strings.TrimSpace(raw)
	if len(secret) < minJWTSecretLen {
		return "", fmt.Errorf("JWT_SECRET must be set to a random value of at least %d characters (found %d). Generate one with: openssl rand -base64 48", minJWTSecretLen, len(secret))
	}
	if secret == legacyDefaultJWTSecret || secret == insecureExampleJWTSecret {
		return "", fmt.Errorf("JWT_SECRET must not use a publicly-known value (legacy default or .env.example placeholder); generate a new random secret with: openssl rand -base64 48")
	}
	return secret, nil
}

func Load() *Config {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}
	jwtSecret, err := ResolveJWTSecret(os.Getenv("JWT_SECRET"))
	if err != nil {
		log.Fatalf("configuration error: %v", err)
	}
	tenantBaseDomain := getenvDefault("TENANT_BASE_DOMAIN", "openrt.local")
	dbURL := firstNonEmpty(os.Getenv("DATABASE_URL"), os.Getenv("DB_URL"))
	dbHost := getenvDefault("DB_HOST", "localhost")
	dbPort := getenvDefault("DB_PORT", "5432")
	dbUser := firstNonEmpty(os.Getenv("DB_USER"), os.Getenv("POSTGRES_USER"))
	if dbUser == "" {
		dbUser = "postgres"
	}
	dbPassword := firstNonEmpty(os.Getenv("DB_PASSWORD"), os.Getenv("POSTGRES_PASSWORD"))
	if dbPassword == "" {
		dbPassword = "postgres"
	}
	dbName := firstNonEmpty(os.Getenv("DB_NAME"), os.Getenv("POSTGRES_DB"))
	if dbName == "" {
		dbName = "transparansi_rt"
	}
	dbSSLMode := getenvDefault("DB_SSLMODE", "disable")
	rateLimitCapacity := getenvInt("RATE_LIMIT_CAPACITY", 1000)
	rateLimitRefill := getenvFloat("RATE_LIMIT_REFILL", 100)
	authRateLimitCapacity := getenvInt("AUTH_RATE_LIMIT_CAPACITY", 20)
	authRateLimitRefill := getenvFloat("AUTH_RATE_LIMIT_REFILL", 5)
	trustedProxyIPs := splitCSV(os.Getenv("TRUSTED_PROXY_IPS"))

	return &Config{
		Port:                  port,
		DatabaseURL:           dbURL,
		DBHost:                dbHost,
		DBPort:                dbPort,
		DBUser:                dbUser,
		DBPassword:            dbPassword,
		DBName:                dbName,
		DBSSLMode:             dbSSLMode,
		JWTSecret:             jwtSecret,
		TenantBaseDomain:      tenantBaseDomain,
		RateLimitCapacity:     rateLimitCapacity,
		RateLimitRefill:       rateLimitRefill,
		AuthRateLimitCapacity: authRateLimitCapacity,
		AuthRateLimitRefill:   authRateLimitRefill,
		TrustedProxyIPs:       trustedProxyIPs,
	}
}

func (c *Config) PostgresConnString() string {
	if c.DatabaseURL != "" {
		return c.DatabaseURL
	}
	return fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s", c.DBHost, c.DBPort, c.DBUser, c.DBPassword, c.DBName, c.DBSSLMode)
}

func getenvDefault(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

// getenvInt parses an integer env var, falling back (with a warning) on unset
// or invalid values. Rate limiting is an availability knob, not a security
// invariant, so a malformed value degrades to the safe default rather than
// crashing the server.
func getenvInt(key string, fallback int) int {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback
	}
	value, err := strconv.Atoi(raw)
	if err != nil || value <= 0 {
		log.Printf("warning: invalid %s=%q, using default %d", key, raw, fallback)
		return fallback
	}
	return value
}

func getenvFloat(key string, fallback float64) float64 {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback
	}
	value, err := strconv.ParseFloat(raw, 64)
	if err != nil || value <= 0 {
		log.Printf("warning: invalid %s=%q, using default %v", key, raw, fallback)
		return fallback
	}
	return value
}

// splitCSV splits a comma-separated list and trims entries, dropping empties.
func splitCSV(raw string) []string {
	if strings.TrimSpace(raw) == "" {
		return nil
	}
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if p = strings.TrimSpace(p); p != "" {
			out = append(out, p)
		}
	}
	return out
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if value != "" {
			return value
		}
	}
	return ""
}
