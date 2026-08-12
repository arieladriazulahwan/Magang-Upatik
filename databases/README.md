# KlikPresensi Database

Folder ini berisi setup database PostgreSQL untuk SI-Presensi Untad.

Schema utama:

```text
init/01_schema-presensi-untad.sql
```

Database menggunakan PostgreSQL 16 dan extension `pgvector`, jadi image Docker yang dipakai adalah:

```text
pgvector/pgvector:pg16
```

## Cara Menjalankan

Salin file environment:

```bash
copy .env.example .env
```

Jalankan database:

```bash
docker compose up -d
```

Cek container:

```bash
docker compose ps
```

Masuk ke PostgreSQL:

```bash
docker exec -it klikpresensi-postgres psql -U presensi_user -d si_presensi_untad
```

## Koneksi Backend

Gunakan connection string berikut dari backend Laravel/API:

```text
postgresql://presensi_user:presensi_password@localhost:5432/si_presensi_untad
```

Untuk Laravel `.env`:

```env
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=si_presensi_untad
DB_USERNAME=presensi_user
DB_PASSWORD=presensi_password
```

## Reset Database

Hapus volume data lokal, lalu jalankan ulang container:

```bash
docker compose down
rmdir /s /q data
docker compose up -d
```

Schema di folder `init/` hanya dijalankan otomatis saat folder `data/` masih kosong.
