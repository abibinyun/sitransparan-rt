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

	"backend/pkg/storage/minio"
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

	// Object storage (MinIO / S3-compatible). If the endpoint is unreachable the
	// server still starts, but uploads fall back to metadata-only URLs.
	storageClient, err := minio.New(
		cfg.MinioEndpoint,
		cfg.MinioAccessKey,
		cfg.MinioSecretKey,
		cfg.MinioUseSSL,
		cfg.MinioBucket,
		cfg.MinioPublicURL,
	)
	if err != nil {
		log.Printf("WARNING: object storage disabled (%v) — uploads will not be persisted", err)
	}

	tenantRepo := repository.NewTenantRepository(db)
	userRepo := repository.NewUserRepository(db)
	tuRepo := repository.NewTenantUserRepository(db)
	roleRepo := repository.NewRoleRepository(db)
	residentRepo := repository.NewResidentRepository(db, storageClient)
	financialRepo := repository.NewFinancialRepository(db, storageClient)
	eventRepo := repository.NewEventRepository(db, storageClient)
	aspirationNeedRepo := repository.NewAspirationNeedRepository(db)
	announcementDocRepo := repository.NewAnnouncementDocRepository(db, storageClient)
	dashboardRepo := repository.NewDashboardRepository(db)
	meetingRepo := repository.NewMeetingRepository(db)
	houseRepo := repository.NewHouseRepository(db)

	jwtSecret := cfg.JWTSecret
	jwtDuration := 24 * time.Hour

	authUC := usecase.NewAuthUsecase(tenantRepo, userRepo, tuRepo, roleRepo, jwtSecret, jwtDuration, cfg.TenantBaseDomain)
	authHandler := delivery.NewAuthHandler(authUC, cfg.TenantBaseDomain)

	healthUC := usecase.NewHealthUsecase()
	healthHandler := delivery.NewHealthHandler(healthUC)

	residentUC := usecase.NewResidentUsecase(residentRepo)
	residentHandler := delivery.NewResidentHandler(residentUC)

	financialUC := usecase.NewFinancialUsecase(financialRepo)
	financialHandler := delivery.NewFinancialHandler(financialUC, tenantRepo, cfg.TenantBaseDomain)

	eventUC := usecase.NewEventUsecase(eventRepo)
	eventHandler := delivery.NewEventHandler(eventUC, tenantRepo, cfg.TenantBaseDomain)

	aspirationNeedUC := usecase.NewAspirationNeedUsecase(aspirationNeedRepo)
	aspirationNeedHandler := delivery.NewAspirationNeedHandler(aspirationNeedUC, tenantRepo, cfg.TenantBaseDomain)

	// Web Push & gamifikasi Fase 4 (dibuat lebih awal: dipakai broadcast pengumuman)
	pushRepo := repository.NewPushRepository(db)
	pushUC := usecase.NewPushUsecase(pushRepo, cfg)

	announcementDocUC := usecase.NewAnnouncementDocUsecase(announcementDocRepo)
	announcementDocHandler := delivery.NewAnnouncementDocHandler(announcementDocUC, tenantRepo, houseRepo, userRepo, cfg.TenantBaseDomain, pushUC)

	dashboardUC := usecase.NewDashboardUsecase(dashboardRepo)
	dashboardHandler := delivery.NewDashboardHandler(dashboardUC)

	userUC := usecase.NewUserUsecase(userRepo, tuRepo, roleRepo)
	userHandler := delivery.NewUserHandlerWithDomain(userUC, cfg.TenantBaseDomain)

	meetingUC := usecase.NewMeetingUsecase(meetingRepo)
	meetingHandler := delivery.NewMeetingHandler(meetingUC, tenantRepo, cfg.TenantBaseDomain)

	// Karang Taruna & Organisasi Kepemudaan
	ktRepo := repository.NewKarangTarunaRepository(db)
	ktUC := usecase.NewKarangTarunaUsecase(ktRepo)
	ktHandler := delivery.NewKarangTarunaHandler(ktUC, tenantRepo, cfg.TenantBaseDomain)

	// Audit Logging Komprehensif (Zero Missed Action)
	auditRepo := repository.NewAuditLogRepository(db)
	auditUC := usecase.NewAuditLogUsecase(auditRepo)
	auditHandler := delivery.NewAuditLogHandler(auditUC)

	// Bank Sampah (Setoran per KK & Bagi Hasil Karang Taruna)
	wasteBankRepo := repository.NewWasteBankRepository(db)
	wasteBankUC := usecase.NewWasteBankUsecase(wasteBankRepo, auditRepo)
	wasteBankHandler := delivery.NewWasteBankHandler(wasteBankUC, tenantRepo, cfg.TenantBaseDomain)

	// House QR Access (1 Rumah = 1 Token)
	houseUC := usecase.NewHouseUsecase(houseRepo, tenantRepo, residentRepo, userRepo, tuRepo, roleRepo, jwtSecret, jwtDuration)
	houseHandler := delivery.NewHouseHandler(houseUC)

	// Inventaris & Aset RT (General Inventory & Peminjaman Barang)
	inventoryRepo := repository.NewInventoryRepository(db)
	inventoryUC := usecase.NewInventoryUsecase(inventoryRepo)
	inventoryHandler := delivery.NewInventoryHandler(inventoryUC)

	// Interaksi sosial Fase 3 (reaksi & polling) — budget rate-limit ketat
	// selaras endpoint auth (anti-spam, konsep portal §7.3).
	socialRepo := repository.NewSocialRepository(db)
	socialUC := usecase.NewSocialUsecase(socialRepo)
	socialHandler := delivery.NewSocialHandler(socialUC, tenantRepo, cfg.TenantBaseDomain)
	pushHandler := delivery.NewPushHandler(pushUC, tenantRepo)

	tenantMw := middleware.TenantMiddleware(tenantRepo, cfg.TenantBaseDomain)
	authMw := middleware.AuthMiddleware(jwtSecret)
	optionalAuthMw := middleware.OptionalAuthMiddleware(jwtSecret)
	adminMw := middleware.RBACMiddleware(domain.RoleSuperAdmin, domain.RoleAdminRT)
	superAdminMw := middleware.RBACMiddleware(domain.RoleSuperAdmin)
	secHeadersMw := middleware.SecurityHeadersMiddleware()
	auditMw := middleware.AuditMiddleware(auditUC)
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
	mux.HandleFunc("GET /api/v1/t/resolve", authHandler.ResolveHost)
	mux.HandleFunc("GET /api/v1/t/{slug}/info", authHandler.GetPublicTenantInfo)
	mux.HandleFunc("GET /api/v1/public/tenants", authHandler.GetPublicTenants)
	fileHandler := delivery.NewStorageFileHandler(storageClient)
	mux.HandleFunc("GET /api/v1/files/", fileHandler.ServeFile)
	// Login/register are the public brute-force surface: apply the stricter
	// per-IP auth budget here (the general limiter below still applies too).
	mux.Handle("POST /api/v1/auth/login", authRateLimitMw(http.HandlerFunc(authHandler.Login)))
	mux.Handle("POST /api/v1/auth/register", authRateLimitMw(http.HandlerFunc(authHandler.Register)))

	// Authenticated routes
	authMux := http.NewServeMux()
	authMux.HandleFunc("GET /api/v1/auth/me", authHandler.Me)
	authMux.HandleFunc("PUT /api/v1/auth/me", authHandler.Me)
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

	// Meeting & Action Items routes
	meetingHandler.RegisterRoutes(mux, tenantMw, authMw)

	// Karang Taruna & Pemuda RT
	ktHandler.RegisterRoutes(mux, tenantMw, authMw)

	// Bank Sampah RT (Program Karang Taruna & Warga)
	wasteBankHandler.RegisterRoutes(mux, tenantMw, authMw)

	// Audit Logs (Zero Missed Action)
	auditHandler.RegisterRoutes(mux, tenantMw, authMw, adminMw)

	// House QR Access (1 Rumah = 1 Token)
	houseHandler.RegisterRoutes(mux, tenantMw, authMw, adminMw)

	// Inventaris RT & Peminjaman Barang
	inventoryHandler.RegisterRoutes(mux, tenantMw, authMw)

	// Social interactions (reactions & polls) — strict rate budget
	socialHandler.RegisterRoutes(mux, tenantMw, authMw, authRateLimitMw)

	// Web Push & badge partisipasi (Fase 4)
	pushHandler.RegisterRoutes(mux, authMw, optionalAuthMw, tenantMw)

	// SuperAdmin routes
	superAdminMux := http.NewServeMux()
	superAdminMux.HandleFunc("/api/v1/superadmin/tenants", authHandler.SuperAdminTenants)
	superAdminMux.HandleFunc("/api/v1/superadmin/tenants/", authHandler.SuperAdminTenants)

	// Mount protected handlers with middleware chain
	mux.Handle("/api/v1/auth/me", authMw(tenantMw(authMux)))
	mux.Handle("/api/v1/auth/tenants", authMw(tenantMw(authMux)))
	mux.Handle("/api/v1/auth/switch-tenant", authMw(tenantMw(authMux)))
	mux.Handle("/api/v1/superadmin/tenants", authMw(superAdminMw(tenantMw(superAdminMux))))
	mux.Handle("/api/v1/superadmin/tenants/", authMw(superAdminMw(tenantMw(superAdminMux))))

	// Wrap root handler with security, CORS, rate limiting, and audit middleware
	var handler http.Handler = mux
	handler = rateLimitMw(handler)
	handler = secHeadersMw(handler)
	handler = corsMw(handler)
	handler = auditMw(handler)

	log.Printf("Server starting on port %s", cfg.Port)
	if err := http.ListenAndServe(":"+cfg.Port, handler); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
