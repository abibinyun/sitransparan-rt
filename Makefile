.PHONY: help dev-up dev-down dev-logs dev-migrate staging-up staging-down staging-logs staging-migrate prod-up prod-down prod-logs prod-migrate test

help:
	@echo "=========================================================="
	@echo " Sitransparan RT/RW Multi-Tier Management"
	@echo "=========================================================="
	@echo " DEV ENVIRONMENT (Hotreload: Vite + Air):"
	@echo "   make dev-up          - Start dev stack (dev.iscube.web.id)"
	@echo "   make dev-down        - Stop dev stack"
	@echo "   make dev-logs        - View dev logs"
	@echo "   make dev-migrate     - Run all migrations to postgres dev"
	@echo ""
	@echo " STAGING ENVIRONMENT (*-staging.iscube.web.id):"
	@echo "   make staging-up      - Start staging stack"
	@echo "   make staging-down    - Stop staging stack"
	@echo "   make staging-logs    - View staging logs"
	@echo "   make staging-migrate - Run all migrations to postgres staging"
	@echo ""
	@echo " PRODUCTION ENVIRONMENT (*.iscube.web.id):"
	@echo "   make prod-up         - Start prod stack"
	@echo "   make prod-down       - Stop prod stack"
	@echo "   make prod-logs       - View prod logs"
	@echo "   make prod-migrate    - Run all migrations to postgres prod"
	@echo ""
	@echo " TESTING & VERIFICATION:"
	@echo "   make test            - Run backend unit tests and frontend typecheck"
	@echo "=========================================================="

test:
	cd backend && go test -v ./...
	cd frontend && npx tsc --noEmit

# ---------- DEV ----------
dev-up:
	cd infrastructure && docker compose -p dev -f docker-compose.dev.yml up -d
	@echo "Menunggu database dev siap..."
	@docker exec transparansi_postgres_dev sh -c 'until pg_isready -U postgres -d transparansi_rt_dev; do sleep 1; done'
	@$(MAKE) dev-migrate

dev-down:
	cd infrastructure && docker compose -p dev -f docker-compose.dev.yml down

dev-logs:
	cd infrastructure && docker compose -p dev -f docker-compose.dev.yml logs -f

dev-migrate:
	@echo "Menjalankan migrasi database dev..."
	@fail=0; for f in backend/migrations/*.up.sql; do \
		if ! docker exec -i transparansi_postgres_dev psql -U postgres -d transparansi_rt_dev < "$$f" > /dev/null 2>&1; then \
			echo "Failed to apply $$f (skipped if idempotent)"; \
		fi; \
	done
	@echo "Migrasi dev selesai."

# ---------- STAGING ----------
staging-up:
	cd infrastructure && docker compose -p staging -f docker-compose.staging.yml up -d
	@echo "Menunggu database staging siap..."
	@docker exec transparansi_postgres_staging sh -c 'until pg_isready -U postgres -d transparansi_rt; do sleep 1; done'
	@$(MAKE) staging-migrate

staging-down:
	cd infrastructure && docker compose -p staging -f docker-compose.staging.yml down

staging-logs:
	cd infrastructure && docker compose -p staging -f docker-compose.staging.yml logs -f

staging-migrate:
	@echo "Menjalankan migrasi database staging..."
	@fail=0; for f in backend/migrations/*.up.sql; do \
		if ! docker exec -i transparansi_postgres_staging psql -U postgres -d transparansi_rt < "$$f" > /dev/null 2>&1; then \
			echo "Failed to apply $$f (skipped if idempotent)"; \
		fi; \
	done
	@echo "Migrasi staging selesai."

# ---------- PRODUCTION ----------
prod-up:
	cd infrastructure && docker compose -p prod -f docker-compose.prod.yml up -d
	@echo "Menunggu database prod siap..."
	@docker exec transparansi_postgres_prod sh -c 'until pg_isready -U postgres -d transparansi_rt_prod; do sleep 1; done'
	@$(MAKE) prod-migrate

prod-down:
	cd infrastructure && docker compose -p prod -f docker-compose.prod.yml down

prod-logs:
	cd infrastructure && docker compose -p prod -f docker-compose.prod.yml logs -f

prod-migrate:
	@echo "Menjalankan migrasi database prod..."
	@fail=0; for f in backend/migrations/*.up.sql; do \
		if ! docker exec -i transparansi_postgres_prod psql -U postgres -d transparansi_rt_prod < "$$f" > /dev/null 2>&1; then \
			echo "Failed to apply $$f (skipped if idempotent)"; \
		fi; \
	done
	@echo "Migrasi prod selesai."
