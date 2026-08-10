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
	TenantContextKey = domain.TenantContextKey
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

type claimsKey string

const jwtClaimsContextKey claimsKey = "jwt_claims"

// GetJWTClaims returns the verified JWT claims stored in the context by
// AuthMiddleware, or nil when the request is not authenticated.
func GetJWTClaims(ctx context.Context) *domain.JWTClaims {
	if claims, ok := ctx.Value(jwtClaimsContextKey).(*domain.JWTClaims); ok {
		return claims
	}
	return nil
}

func GetTenantIDFromClaims(ctx context.Context) uuid.UUID {
	if claims := GetJWTClaims(ctx); claims != nil {
		return claims.TenantID
	}
	return uuid.Nil
}

// WithClaims returns a context carrying verified JWT claims, user id, and role.
// AuthMiddleware uses it to publish the verified identity; tests and internal
// flows can use it to build requests with an authenticated identity.
func WithClaims(ctx context.Context, claims *domain.JWTClaims) context.Context {
	if claims == nil {
		return ctx
	}
	ctx = context.WithValue(ctx, UserContextKey, claims.UserID)
	ctx = context.WithValue(ctx, RoleContextKey, claims.Role)
	ctx = context.WithValue(ctx, jwtClaimsContextKey, claims)
	return ctx
}

// TenantMiddleware derives the tenant context from the authenticated identity
// (JWT claims) ONLY. Client-supplied tenant hints (X-Tenant-ID header, query
// parameters, subdomains) are never trusted, because they can be manipulated to
// escalate a user from tenant A to tenant B. The trusted tenant must always be
// the tenant the signed-in user is authorized for.
//
// The middleware must be mounted INSIDE AuthMiddleware so verified JWT claims
// are already present in the request context.
func TenantMiddleware(tenantRepo domain.TenantRepository) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims := GetJWTClaims(r.Context())
			// An authenticated identity that carries a tenant scope but whose
			// tenant no longer exists (deleted) must be denied explicitly instead
			// of silently proceeding without a tenant context.
			if claims != nil && claims.UserID != uuid.Nil && claims.TenantID != uuid.Nil {
				tenant, err := tenantRepo.GetByID(r.Context(), claims.TenantID)
				if err != nil || tenant == nil {
					http.Error(w, `{"error":"forbidden: tenant access denied"}`, http.StatusForbidden)
					return
				}
				ctx := context.WithValue(r.Context(), TenantContextKey, tenant)
				next.ServeHTTP(w, r.WithContext(ctx))
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// AuthMiddleware validates the JWT from the Authorization header and injects
// the verified claims into the request context. The signing algorithm is pinned
// to HS256 to prevent algorithm-confusion attacks, and a token without a valid
// user id is rejected.
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
			}, jwt.WithValidMethods([]string{"HS256"}))

			if err != nil || !token.Valid || claims.UserID == uuid.Nil {
				http.Error(w, `{"error":"invalid or expired token"}`, http.StatusUnauthorized)
				return
			}

			next.ServeHTTP(w, r.WithContext(WithClaims(r.Context(), claims)))
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

			userRoleLower := strings.ToLower(string(userRole))
			allowed := false
			for _, role := range allowedRoles {
				roleLower := strings.ToLower(string(role))
				if roleLower == userRoleLower || (roleLower == "superadmin" && (userRoleLower == "super_admin" || userRoleLower == "superadmin")) {
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

// RequireAnyRole reports whether the authenticated caller's role is among the
// allowed roles. Matching is case-insensitive and accepts the superadmin /
// super_admin aliases used across the codebase. It is used by handlers to guard
// write/approve operations that must be restricted to admin roles.
func RequireAnyRole(r *http.Request, roles ...domain.RoleName) bool {
	caller := strings.ToLower(string(GetRoleFromContext(r.Context())))
	if caller == "" {
		return false
	}
	for _, role := range roles {
		allowed := strings.ToLower(string(role))
		if caller == allowed ||
			(allowed == "superadmin" && (caller == "super_admin" || caller == "superadmin")) ||
			(allowed == "super_admin" && caller == "superadmin") {
			return true
		}
	}
	return false
}
