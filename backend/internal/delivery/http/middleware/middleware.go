package middleware

import (
	"context"
	"net/http"
	"strings"

	"backend/internal/domain"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type contextKey string

const (
	TenantContextKey contextKey = "tenant"
	UserContextKey   contextKey = "user_id"
	RoleContextKey   contextKey = "role"
)

func GetTenantFromContext(ctx context.Context) *domain.Tenant {
	if t, ok := ctx.Value(TenantContextKey).(*domain.Tenant); ok {
		return t
	}
	return nil
}

func GetUserIDFromContext(ctx context.Context) uuid.UUID {
	if id, ok := ctx.Value(UserContextKey).(uuid.UUID); ok {
		return id
	}
	return uuid.Nil
}

func GetRoleFromContext(ctx context.Context) domain.RoleName {
	if r, ok := ctx.Value(RoleContextKey).(domain.RoleName); ok {
		return r
	}
	return ""
}

// TenantMiddleware resolves Tenant from X-Tenant-ID header, subdomain, or JWT claims.
func TenantMiddleware(tenantRepo domain.TenantRepository) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			var tenant *domain.Tenant

			// 1. Try X-Tenant-ID header
			tenantIDStr := r.Header.Get("X-Tenant-ID")
			if tenantIDStr != "" {
				if tid, parseErr := uuid.Parse(tenantIDStr); parseErr == nil {
					tenant, _ = tenantRepo.GetByID(r.Context(), tid)
				}
			}

			// 2. Try Subdomain / Host
			if tenant == nil {
				host := r.Host
				if idx := strings.Index(host, ":"); idx != -1 {
					host = host[:idx]
				}
				parts := strings.Split(host, ".")
				if len(parts) >= 3 {
					subdomain := parts[0]
					tenant, _ = tenantRepo.GetBySlug(r.Context(), subdomain)
				}
				if tenant == nil {
					tenant, _ = tenantRepo.GetByDomain(r.Context(), host)
				}
			}

			// 3. Fallback to JWT claims tenant_id if present in context
			if tenant == nil {
				if tid := GetTenantIDFromClaims(r.Context()); tid != uuid.Nil {
					tenant, _ = tenantRepo.GetByID(r.Context(), tid)
				}
			}

			if tenant != nil {
				ctx := context.WithValue(r.Context(), TenantContextKey, tenant)
				r = r.WithContext(ctx)
			}

			next.ServeHTTP(w, r)
		})
	}
}

type claimsKey string

const jwtClaimsContextKey claimsKey = "jwt_claims"

func GetTenantIDFromClaims(ctx context.Context) uuid.UUID {
	if claims, ok := ctx.Value(jwtClaimsContextKey).(*domain.JWTClaims); ok {
		return claims.TenantID
	}
	return uuid.Nil
}

// AuthMiddleware validates JWT token from Authorization header and injects claims/user into Context.
func AuthMiddleware(jwtSecret string) func(http.Handler) http.Handler {
	secret := []byte(jwtSecret)
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
				http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
				return
			}

			tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
			claims := &domain.JWTClaims{}

			token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
				return secret, nil
			})

			if err != nil || !token.Valid {
				http.Error(w, `{"error":"invalid or expired token"}`, http.StatusUnauthorized)
				return
			}

			ctx := r.Context()
			ctx = context.WithValue(ctx, UserContextKey, claims.UserID)
			ctx = context.WithValue(ctx, RoleContextKey, claims.Role)
			ctx = context.WithValue(ctx, jwtClaimsContextKey, claims)

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// RBACMiddleware enforces required roles (e.g. superadmin, admin_rt, resident).
func RBACMiddleware(allowedRoles ...domain.RoleName) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userRole := GetRoleFromContext(r.Context())
			if userRole == "" {
				http.Error(w, `{"error":"forbidden: role not specified"}`, http.StatusForbidden)
				return
			}

			allowed := false
			for _, r := range allowedRoles {
				if r == userRole {
					allowed = true
					break
				}
			}

			if !allowed {
				http.Error(w, `{"error":"forbidden: insufficient permissions"}`, http.StatusForbidden)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
