package middleware

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"

	"backend/internal/domain"
)

type responseRecorder struct {
	http.ResponseWriter
	statusCode int
}

func (rec *responseRecorder) WriteHeader(code int) {
	rec.statusCode = code
	rec.ResponseWriter.WriteHeader(code)
}

// AuditMiddleware records all non-GET HTTP requests and auth attempts to audit_logs asynchronously.
func AuditMiddleware(auditUC domain.AuditLogUsecase) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Skip swagger, health checks, and static asset polling
			path := r.URL.Path
			if path == "/health" || strings.HasPrefix(path, "/swagger") {
				next.ServeHTTP(w, r)
				return
			}

			// Record only state-changing methods or auth login/register endpoints
			isStateChanging := r.Method == http.MethodPost ||
				r.Method == http.MethodPut ||
				r.Method == http.MethodPatch ||
				r.Method == http.MethodDelete

			isAuthEndpoint := strings.HasPrefix(path, "/api/v1/auth/")

			if !isStateChanging && !isAuthEndpoint {
				next.ServeHTTP(w, r)
				return
			}

			// Pre-parse Authorization header if available
			var preTenantID, preUserID *uuid.UUID
			authHeader := r.Header.Get("Authorization")
			if strings.HasPrefix(authHeader, "Bearer ") {
				tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
				mapClaims := jwt.MapClaims{}
				token, _, err := new(jwt.Parser).ParseUnverified(tokenStr, mapClaims)
				if err == nil && token != nil {
					if tStr, ok := mapClaims["tenant_id"].(string); ok && tStr != "" {
						if tUUID, err := uuid.Parse(tStr); err == nil && tUUID != uuid.Nil {
							preTenantID = &tUUID
						}
					}
					if uStr, ok := mapClaims["user_id"].(string); ok && uStr != "" {
						if uUUID, err := uuid.Parse(uStr); err == nil && uUUID != uuid.Nil {
							preUserID = &uUUID
						}
					}
				}
			}

			start := time.Now()
			rec := &responseRecorder{ResponseWriter: w, statusCode: http.StatusOK}

			next.ServeHTTP(rec, r)

			// Capture context after request has been processed (user/tenant attached)
			var tenantID *uuid.UUID
			if t := GetTenantFromContext(r.Context()); t != nil && t.ID != uuid.Nil {
				tenantID = &t.ID
			} else if tid := GetTenantIDFromClaims(r.Context()); tid != uuid.Nil {
				tenantID = &tid
			} else {
				tenantID = preTenantID
			}

			var userID *uuid.UUID
			if uid := GetUserIDFromContext(r.Context()); uid != uuid.Nil {
				userID = &uid
			} else if claims := GetJWTClaims(r.Context()); claims != nil && claims.UserID != uuid.Nil {
				userID = &claims.UserID
			} else {
				userID = preUserID
			}

			ip := r.Header.Get("X-Forwarded-For")
			if ip == "" {
				ip = r.RemoteAddr
			}
			if idx := strings.Index(ip, ","); idx != -1 {
				ip = strings.TrimSpace(ip[:idx])
			}
			if idx := strings.LastIndex(ip, ":"); idx != -1 && !strings.Contains(ip, "]") {
				ip = ip[:idx]
			}

			userAgent := r.UserAgent()

			status := "SUCCESS"
			if rec.statusCode >= 400 {
				status = "FAILED"
			}

			action := r.Method + " " + path
			resource := inferResource(path)

			// Copy pointer values safely for async goroutine
			var asyncTenantID, asyncUserID *uuid.UUID
			if tenantID != nil {
				val := *tenantID
				asyncTenantID = &val
			}
			if userID != nil {
				val := *userID
				asyncUserID = &val
			}

			// Asynchronous dispatch to avoid adding request latency
			go func(tID, uID *uuid.UUID, act, res, clientIP, uAgent, st string, code int, dur time.Duration) {
				ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
				defer cancel()

				_ = auditUC.Log(ctx, &domain.AuditLog{
					TenantID:  tID,
					UserID:    uID,
					Action:    act,
					Resource:  res,
					IPAddress: clientIP,
					UserAgent: uAgent,
					Status:    st,
					Payload: map[string]interface{}{
						"status_code": code,
						"duration_ms": dur.Milliseconds(),
					},
					CreatedAt: time.Now(),
				})
			}(asyncTenantID, asyncUserID, action, resource, ip, userAgent, status, rec.statusCode, time.Since(start))
		})
	}
}

func inferResource(path string) string {
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) >= 3 && parts[0] == "api" && parts[1] == "v1" {
		return parts[2]
	}
	return "system"
}
