.PHONY: help up down restart logs clean

help:
	@echo "Perintah yang tersedia:"
	@echo "  make up      - Jalankan service (PostgreSQL & MinIO) via docker-compose"
	@echo "  make down    - Hentikan service"
	@echo "  make restart - Hentikan lalu jalankan ulang service"
	@echo "  make logs    - Tampilkan log dari service"
	@echo "  make clean   - Hentikan service dan hapus volume data"

up:
	docker compose up -d

down:
	docker compose down

restart: down up

logs:
	docker compose logs -f

clean:
	docker compose down -v
