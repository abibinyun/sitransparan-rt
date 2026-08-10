.PHONY: help up down restart logs clean migrate

help:
	@echo "Perintah yang tersedia:"
	@echo "  make up      - Jalankan service via docker-compose & jalankan migrasi"
	@echo "  make migrate - Jalankan migrasi SQL ke database PostgreSQL"
	@echo "  make down    - Hentikan service"
	@echo "  make restart - Hentikan lalu jalankan ulang service"
	@echo "  make logs    - Tampilkan log dari service"
	@echo "  make clean   - Hentikan service dan hapus volume data"

up:
	docker compose -f infrastructure/docker-compose.yml up -d --build
	@echo "Menunggu database siap..."
	@docker exec transparansi_postgres sh -c 'until pg_isready -U postgres -d transparansi_rt; do sleep 1; done'
	@$(MAKE) migrate

migrate:
	@echo "Menjalankan migrasi database..."
	@fail=0; for f in backend/migrations/*.up.sql; do \
		echo "Applying $$f..."; \
		if ! docker exec -i transparansi_postgres psql -U postgres -d transparansi_rt < "$$f" > /tmp/migrate-$$(basename $$f).log 2>&1; then \
			echo "ERROR: migration failed: $$f"; \
			cat /tmp/migrate-$$(basename $$f).log; \
			fail=1; \
		fi; \
	done; \
	if [ $$fail -ne 0 ]; then echo "Migrasi GAGAL — periksa log di atas."; exit 1; fi
	@echo "Migrasi selesai."

down:
	docker compose -f infrastructure/docker-compose.yml down

restart: down up

logs:
	docker compose -f infrastructure/docker-compose.yml logs -f

clean:
	docker compose -f infrastructure/docker-compose.yml down -v
