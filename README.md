# SEAPEDIA — Backend API

Backend REST API untuk **SEAPEDIA**, sebuah marketplace multi-peran (buyer, seller, driver, admin) yang dibangun untuk kompetisi COMPFEST. API ini menangani autentikasi, manajemen produk & toko, keranjang & pesanan, dompet, pengiriman, ulasan aplikasi, serta panel admin.

## Tech Stack

- **Runtime:** Node.js 22+ (ESM)
- **Framework:** Express 5
- **Bahasa:** TypeScript
- **ORM:** Prisma 7 (generator `prisma-client`, adapter `@prisma/adapter-pg`)
- **Database:** PostgreSQL (di-host di Supabase)
- **Storage:** Supabase Storage (untuk gambar produk)
- **Autentikasi:** JWT (access + refresh token) dengan bcrypt
- **Validasi:** Zod
- **Keamanan:** Helmet, CORS, express-rate-limit, sanitize-html
- **Dokumentasi API:** Swagger UI (OpenAPI)

## Arsitektur

Kode disusun berlapis agar mudah dirawat:

```
src/
├── app.ts            # Konfigurasi Express (middleware, mount routes)
├── server.ts         # Entry point (HTTP server, listen)
├── config/           # Konfigurasi environment, pricing, Supabase
├── routes/           # Definisi endpoint per peran
├── controllers/      # Menangani request/response
├── services/         # Logika bisnis
├── repositories/     # Akses database (Prisma)
├── middlewares/      # Auth, validasi, error handler, upload
├── validators/       # Skema Zod
├── db/               # Inisialisasi Prisma client
├── utils/            # Helper (AppError, dll)
├── docs/             # Spesifikasi OpenAPI
└── generated/        # Prisma client hasil generate (jangan diedit manual)
```

Format respons konsisten:

- **Sukses:** `{ "success": true, "data": ... }`
- **Error:** `{ "success": false, "code": "...", "message": "...", "errors": ... }`
- **List berpaginasi:** `{ "data": [...], "pagination": { "page", "limit", "total", "totalPages" } }`

## Prasyarat

- Node.js versi 22 atau lebih baru
- Akses ke database PostgreSQL (mis. project Supabase)
- Bucket Supabase Storage untuk gambar produk

## Environment Variables

Buat file `.env` di root proyek dengan variabel berikut:

| Variabel                    | Wajib | Keterangan                                                                       |
| --------------------------- | :---: | -------------------------------------------------------------------------------- |
| `DATABASE_URL`              |  ✅   | Connection string PostgreSQL (gunakan connection pooler Supabase untuk produksi) |
| `DIRECT_URL`                |  ✅   | Connection string langsung (port 5432) untuk migrasi Prisma                      |
| `JWT_ACCESS_SECRET`         |  ✅   | Secret untuk menandatangani access token                                         |
| `JWT_REFRESH_SECRET`        |  ✅   | Secret untuk menandatangani refresh token                                        |
| `JWT_ROLE_PENDING_SECRET`   |  ✅   | Secret untuk token sementara saat pemilihan peran                                |
| `SUPABASE_URL`              |  ✅   | URL project Supabase                                                             |
| `SUPABASE_SERVICE_ROLE_KEY` |  ✅   | Service role key Supabase (untuk upload storage)                                 |
| `SUPABASE_BUCKET`           |  ✅   | Nama bucket penyimpanan gambar produk                                            |
| `PORT`                      |  ❌   | Port server (default `4000`; di Render/host disuntik otomatis)                   |
| `NODE_ENV`                  |  ❌   | `development` atau `production`                                                  |
| `CORS_ORIGIN`               |  ❌   | Daftar origin yang diizinkan, dipisah koma (default mengizinkan semua)           |
| `ACCESS_TOKEN_TTL`          |  ❌   | Masa berlaku access token (default `15m`)                                        |
| `REFRESH_TOKEN_TTL`         |  ❌   | Masa berlaku refresh token (default `7d`)                                        |
| `ROLE_PENDING_TOKEN_TTL`    |  ❌   | Masa berlaku token pemilihan peran (default `5m`)                                |

> **Catatan:** `.env` tidak ikut di-commit. Saat deploy (mis. Render), set semua variabel ini di dashboard environment platform.

## Menjalankan Secara Lokal

```bash
# 1. Install dependency
npm install

# 2. Generate Prisma client
npm run prisma:generate

# 3. Jalankan migrasi database
npm run prisma:migrate

# 4. (Opsional) Isi data awal / seed
npm run prisma:seed

# 5. Jalankan server mode pengembangan (auto-reload)
npm run dev
```

Server berjalan di `http://localhost:4000` (atau sesuai `PORT`).

## Script NPM

| Script                    | Fungsi                                                    |
| ------------------------- | --------------------------------------------------------- |
| `npm run dev`             | Jalankan server dev dengan auto-reload (tsx watch)        |
| `npm run build`           | Generate Prisma client lalu compile TypeScript ke `dist/` |
| `npm start`               | Jalankan server hasil build (`dist/server.js`)            |
| `npm run prisma:generate` | Generate Prisma client                                    |
| `npm run prisma:migrate`  | Jalankan migrasi database                                 |
| `npm run prisma:seed`     | Isi database dengan data awal                             |

## Build untuk Produksi

```bash
npm run build   # prisma generate && tsc
npm start       # node dist/server.js
```

> **Penting:** `prisma generate` wajib dijalankan sebelum `tsc`, karena generator `prisma-client` menghasilkan file TypeScript yang ikut dikompilasi. Script `build` sudah mengaturnya secara berurutan.

## Akun Demo (Seed)

Setelah seed dijalankan, tersedia akun demo dengan password **`Password123!`**:

| Username      | Peran            |
| ------------- | ---------------- |
| `buyer_demo`  | Buyer            |
| `seller_demo` | Seller (+ Buyer) |
| `driver_demo` | Driver (+ Buyer) |
| `admin`       | Admin            |

Setiap akun otomatis memiliki peran Buyer. Kode diskon contoh: `SAVE10`, `FLAT25K`, `PROMO15`.

## Ringkasan Endpoint

Semua endpoint diawali prefix `/api`.

### Autentikasi (`/api/auth`)

- `POST /login` — login, mengembalikan access & refresh token
- `POST /refresh` — perbarui access token
- `POST /logout` — logout
- `GET /me` — info user saat ini

### Buyer (`/api/buyer`)

- `GET /wallet` — saldo dompet
- `GET /addresses` — daftar alamat
- `GET /cart`, `POST /cart/items`, `DELETE /cart` — manajemen keranjang
- `GET /reports/spending` — laporan pengeluaran

### Seller (`/api/seller`)

- `GET /store` — info toko
- `GET /reports/income` — laporan pendapatan
- (produk, pesanan, dll)

### Driver (`/api/driver`)

- `GET /jobs/active` — pekerjaan pengiriman aktif
- `GET /earnings` — pendapatan driver

### Admin (`/api/admin`)

- `GET /dashboard` — ringkasan dashboard
- `GET /users`, `GET /stores`, `GET /orders` — manajemen entitas
- `POST /system/advance-day`, `POST /system/reset-time` — kontrol waktu sistem (simulasi)

### Lain-lain

- `GET /api/health` — health check (untuk monitoring/keep-alive)
- `GET /api/me/summary` — ringkasan akun
- Endpoint publik untuk katalog produk & ulasan aplikasi

### Dokumentasi Interaktif

Swagger UI tersedia di:

```
/api/docs
```

## Deployment

Backend ini di-deploy menggunakan **Docker** (lihat `Dockerfile`) dan dapat dijalankan di platform mana pun yang mendukung container (mis. Render).

Poin penting saat deploy:

- Set semua environment variable wajib di dashboard platform.
- Server bind ke `0.0.0.0` agar dapat diakses dari luar container.
- Gunakan `/api/health` sebagai health check path.
- Untuk mencegah cold start pada instance gratis, gunakan layanan monitoring (mis. UptimeRobot) yang mem-ping `/api/health` secara berkala.

## Lisensi

ISC
