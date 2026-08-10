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

	authUC := usecase.NewAuthUsecase(tenantRepo, userRepo, tuRepo, roleRepo, jwtSecret, jwtDuration)
	authHandler := delivery.NewAuthHandler(authUC)

	healthUC := usecase.NewHealthUsecase()
	healthHandler := delivery.NewHealthHandler(healthUC)

	residentUC := usecase.NewResidentUsecase(residentRepo)
	residentHandler := delivery.NewResidentHandler(residentUC)

	financialUC := usecase.NewFinancialUsecase(financialRepo)
	financialHandler := delivery.NewFinancialHandler(financialUC)

	eventUC := usecase.NewEventUsecase(eventRepo)
	eventHandler := delivery.NewEventHandler(eventUC)

	aspirationNeedUC := usecase.NewAspirationNeedUsecase(aspirationNeedRepo)
	aspirationNeedHandler := delivery.NewAspirationNeedHandler(aspirationNeedUC, tenantRepo)

	announcementDocUC := usecase.NewAnnouncementDocUsecase(announcementDocRepo)
	announcementDocHandler := delivery.NewAnnouncementDocHandler(announcementDocUC, tenantRepo)

	dashboardUC := usecase.NewDashboardUsecase(dashboardRepo)
	dashboardHandler := delivery.NewDashboardHandler(dashboardUC)

	userUC := usecase.NewUserUsecase(userRepo, tuRepo, roleRepo)
	userHandler := delivery.NewUserHandler(userUC)

	tenantMw := middleware.TenantMiddleware(tenantRepo)
	authMw := middleware.AuthMiddleware(jwtSecret)
	adminMw := middleware.RBACMiddleware(domain.RoleSuperAdmin, domain.RoleAdminRT)
	superAdminMw := middleware.RBACMiddleware(domain.RoleSuperAdmin)
	secHeadersMw := middleware.SecurityHeadersMiddleware()
	rateLimitMw := middleware.RateLimitMiddleware(100, 10) // capacity 100, 10 req/s
	corsMw := middleware.CORSMiddleware("*")

	mux := http.NewServeMux()

	// Public routes
	delivery.RegisterSwaggerRoutes(mux)
	mux.HandleFunc("GET /health", healthHandler.HealthCheck)
	mux.HandleFunc("GET /api/v1/t/{slug}/info", authHandler.GetPublicTenantInfo)
	mux.HandleFunc("POST /api/v1/auth/login", authHandler.Login)
	mux.HandleFunc("POST /api/v1/auth/register", authHandler.Register)

	// Authenticated routes
	authMux := http.NewServeMux()
	authMux.HandleFunc("GET /api/v1/auth/tenants", authHandler.UserTenants)

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
