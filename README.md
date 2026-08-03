# Monorepo Transparansi RT/RW

Platform Transparansi RT/RW untuk pengelolaan data keuangan, laporan warga, dan dokumen pendukung lingkungan.

## Service Infrastruktur

1. **PostgreSQL 16**
   - Database relasional utama.
   - Port default: `5432`

2. **MinIO**
   - Object storage S3-compatible untuk penyimpanan berkas.
   - Port API default: `9000`
   - Port Console default: `9001`

## Cara Memulai

1. Salin `.env.example` ke `.env`:
   ```bash
   cp .env.example .env
   ```

2. Jalankan service menggunakan Makefile:
   ```bash
   make up
   ```

3. Hentikan service:
   ```bash
   make down
   ```

## Perintah Makefile

- `make up` - Menjalankan PostgreSQL & MinIO secara detached.
- `make down` - Mematikan service.
- `make restart` - Restart service.
- `make logs` - Melihat log dari container.
- `make clean` - Mematikan service dan menghapus volume data.
