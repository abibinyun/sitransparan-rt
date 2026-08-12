package main

import (
	"database/sql"
	"log"
	"net/http"
	"time"

	delivery "backend/internal/delivery/http"
	"backend/internal/delivery/http/middleware"
	"backend/internal/domain"
	"backend/internal/repository"
	"backend/internal/usecase"
	"backend/pkg/config"

	_ "github.com/lib/pq"
)

func main() {
	cfg := config.Load()

	db, err := sql.Open("postgres", cfg.PostgresConnString())
	if err != nil {
		log.Fatalf("failed to open database connection: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("failed to ping database: %v", err)
	}

	tenantRepo := repository.NewTenantRepository(db)
	userRepo := repository.NewUserRepository(db)
	tuRepo := repository.NewTenantUserRepository(db)
	roleRepo := repository.NewRoleRepository(db)
	residentRepo := repository.NewResidentRepository(db)
	financialRepo := repository.NewFinancialRepository(db, nil)
	eventRepo := repository.NewEventRepository(db, nil)
	aspirationNeedRepo := repository.NewAspirationNeedRepository(db)
	announcementDocRepo := repository.NewAnnouncementDocRepository(db, nil)
	dashboardRepo := repository.NewDashboardRepository(db)

	jwtSecret := cfg.JWTSecret
	jwtDuration := 24 * time.Hour

	authUC := usecase.NewAuthUsecase(tenantRepo, userRepo, tuRepo, roleRepo, jwtSecret, jwtDuration, cfg.TenantBaseDomain)
	authHandler := delivery.NewAuthHandler(authUC, cfg.TenantBaseDomain)

	healthUC := usecase.NewHealthUsecase()
	healthHandler := delivery.NewHealthHandler(healthUC)

	residentUC := usecase.NewResidentUsecase(residentRepo)
	residentHandler := delivery.NewResidentHandler(residentUC)

	financialUC := usecase.NewFinancialUsecase(financialRepo)
	financialHandler := delivery.NewFinancialHandler(financialUC)

	eventUC := usecase.NewEventUsecase(eventRepo)
	eventHandler := delivery.NewEventHandler(eventUC)

	aspirationNeedUC := usecase.NewAspirationNeedUsecase(aspirationNeedRepo)
	aspirationNeedHandler := delivery.NewAspirationNeedHandler(aspirationNeedUC, tenantRepo, cfg.TenantBaseDomain)

	announcementDocUC := usecase.NewAnnouncementDocUsecase(announcementDocRepo)
	announcementDocHandler := delivery.NewAnnouncementDocHandler(announcementDocUC, tenantRepo, cfg.TenantBaseDomain)

	dashboardUC := usecase.NewDashboardUsecase(dashboardRepo)
	dashboardHandler := delivery.NewDashboardHandler(dashboardUC)

	userUC := usecase.NewUserUsecase(userRepo, tuRepo, roleRepo)
	userHandler := delivery.NewUserHandler(userUC)

	tenantMw := middleware.TenantMiddleware(tenantRepo, cfg.TenantBaseDomain)
	authMw := middleware.AuthMiddleware(jwtSecret)
	adminMw := middleware.RBACMiddleware(domain.RoleSuperAdmin, domain.RoleAdminRT)
	superAdminMw := middleware.RBACMiddleware(domain.RoleSuperAdmin)
	secHeadersMw := middleware.SecurityHeadersMiddleware()
	// Per-client-IP token bucket: each source IP gets its own budget (default
	// 1000 tokens, 100 req/s), so the UI's parallel page-load requests are fine
	// and one abusive client can never 429 the whole API for everyone else.
	// /health and /swagger are exempt. X-Forwarded-For is only honored from
	// peers listed in TRUSTED_PROXY_IPS.
	rateLimitMw := middleware.NewIPRateLimiter(cfg.RateLimitCapacity, cfg.RateLimitRefill, cfg.TrustedProxyIPs).Middleware()
	// Stricter per-IP budget for the public auth endpoints (brute-force surface).
	authRateLimitMw := middleware.NewIPRateLimiter(cfg.AuthRateLimitCapacity, cfg.AuthRateLimitRefill, cfg.TrustedProxyIPs).Middleware()
	corsMw := middleware.CORSMiddleware(cfg.TenantBaseDomain)

	if len(cfg.TrustedProxyIPs) == 0 {
		log.Printf("WARNING: TRUSTED_PROXY_IPS is empty — per-IP rate limiting keys on the direct peer. Behind a reverse proxy (Traefik/Nginx) all clients share the proxy's IP, so set TRUSTED_PROXY_IPS (exact IP or CIDR) in production.")
	}

	mux := http.NewServeMux()

	// Public routes
	delivery.RegisterSwaggerRoutes(mux)
	mux.HandleFunc("GET /health", healthHandler.HealthCheck)
	mux.HandleFunc("GET /api/v1/t/{slug}/info", authHandler.GetPublicTenantInfo)
	// Login/register are the public brute-force surface: apply the stricter
	// per-IP auth budget here (the general limiter below still applies too).
	mux.Handle("POST /api/v1/auth/login", authRateLimitMw(http.HandlerFunc(authHandler.Login)))
	mux.Handle("POST /api/v1/auth/register", authRateLimitMw(http.HandlerFunc(authHandler.Register)))

	// Authenticated routes
	authMux := http.NewServeMux()
	authMux.HandleFunc("GET /api/v1/auth/tenants", authHandler.UserTenants)
	authMux.HandleFunc("POST /api/v1/auth/switch-tenant", authHandler.SwitchTenant)

	// User Management routes
	userHandler.RegisterRoutes(mux, tenantMw, authMw, adminMw)

	// Resident routes
	residentHandler.RegisterRoutes(mux, tenantMw, authMw)

	// Financial routes
	financialHandler.RegisterRoutes(mux, tenantMw, authMw)

	// Event routes
	eventHandler.RegisterRoutes(mux, tenantMw, authMw)

	// Aspiration & Community Need routes
	aspirationNeedHandler.RegisterRoutes(mux, tenantMw, authMw)

	// Announcement & Document routes
	announcementDocHandler.RegisterRoutes(mux, tenantMw, authMw)

	// Dashboard & Reports routes
	dashboardHandler.RegisterRoutes(mux, tenantMw, authMw)

	// SuperAdmin routes
	superAdminMux := http.NewServeMux()
	superAdminMux.HandleFunc("/api/v1/superadmin/tenants", authHandler.SuperAdminTenants)
	superAdminMux.HandleFunc("/api/v1/superadmin/tenants/", authHandler.SuperAdminTenants)

	// Mount protected handlers with middleware chain
	mux.Handle("/api/v1/auth/tenants", authMw(tenantMw(authMux)))
	mux.Handle("/api/v1/auth/switch-tenant", authMw(tenantMw(authMux)))
	mux.Handle("/api/v1/superadmin/tenants", authMw(superAdminMw(tenantMw(superAdminMux))))
	mux.Handle("/api/v1/superadmin/tenants/", authMw(superAdminMw(tenantMw(superAdminMux))))

	// Wrap root handler with security, CORS, and rate limiting middleware
	var handler http.Handler = mux
	handler = rateLimitMw(handler)
	handler = secHeadersMw(handler)
	handler = corsMw(handler)

	log.Printf("Server starting on port %s", cfg.Port)
	if err := http.ListenAndServe(":"+cfg.Port, handler); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
