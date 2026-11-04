# Mini Project Server

Backend service yang dibangun menggunakan **Bun**, **Express.js**, **TypeScript**, dan **Prisma ORM** dengan database **PostgreSQL (Neon Serverless)**.

---

## 📋 Prasyarat (Prerequisites)

Pastikan kamu sudah menginstall [Bun](https://bun.sh/) di komputermu:

```bash
# Cek apakah bun sudah terinstall
bun -v

# Jika belum ada, install Bun (macOS/Linux):
curl -fsSL https://bun.sh/install | bash
```

---

## 🚀 Panduan Setup & Instalasi

Ikuti langkah-langkah berikut setelah melakukan `git clone`:

### 1. Masuk ke Direktori Proyek

```bash
cd mini-project-server
```

### 2. Install Dependencies

```bash
bun install
```

### 3. Konfigurasi Environment Variable (`.env`)

Salin file `.env.example` menjadi file `.env`:

```bash
cp .env.example .env
```

Buka file `.env` dan masukkan connection string database Neon PostgreSQL milikmu atau yang sudah disediakan tim:

```env
PORT=5000
APP_VERSION=0.0.1
# Postgres — your database connection
DATABASE_URL="YOUR_DATABASE_URL"
DATABASE_URL_POOLED="YOUR_DATABASE_URL_POOLED"
# Other
SESSION_SECRET=your-secret-key
CLIENT_ORIGIN=http://localhost:3000,http://localhost:5000
# Resend Email Config
RESEND_API_KEY="re_your_api_key_here"
EMAIL_FROM="EventMgmt <noreply@yourdomain.com>"
# Cloudinary Config
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 4. Sinkronisasi Database & Generate Prisma Client

Project ini menggunakan Prisma 7 dengan konfigurasi multi-file (`prisma7.config.ts`). Jalankan script berikut:

```bash
# 1. Generate Prisma Client TypeScript
bun run prisma:generate

# 2. Push schema model ke database Neon (jika dibutuhkan)
bun x prisma db push --config prisma7.config.ts
```

### 5. Jalankan Development Server

```bash
bun dev
```

Server akan aktif di: **`http://localhost:5000`** 🚀

Dokumentasi Interaktif API (Swagger UI) dapat diakses di:
👉 **`http://localhost:5000/docs`**

---

## 📚 Ringkasan Endpoint API (`/api/v1`)

| Modul | Method | Endpoint | Deskripsi | Auth |
| :--- | :---: | :--- | :--- | :---: |
| **Auth** | `POST` | `/auth/register` | Pendaftaran akun baru (Customer / Organizer) | Publik |
| | `POST` | `/auth/verify-email` | Verifikasi email via kode 6-digit OTP | Publik |
| | `POST` | `/auth/resend-verification` | Kirim ulang OTP verifikasi | Publik |
| | `POST` | `/auth/login` | Login user & generate HttpOnly session cookie | Publik |
| | `POST` | `/auth/logout` | Logout & revoke session di database | Login |
| | `GET` | `/auth/me` | Cek profil user yang sedang login | Login |
| | `POST` | `/auth/forgot-password` | Request OTP reset password via email | Publik |
| | `POST` | `/auth/verify-reset-password` | Verifikasi OTP reset password & dapatkan resetToken | Publik |
| | `POST` | `/auth/reset-password` | Ganti password baru dengan resetToken | Publik |
| | `POST` | `/auth/change-password` | Ganti password saat posisi login | Login |
| **User** | `GET` | `/users/me` | Ambil detail profil user | Login |
| | `PATCH` | `/users/me` | Edit profil user (nama, avatarUrl) | Login |
| **Upload** | `POST` | `/upload/image` | Kompresi gambar (WebP) & upload ke Cloudinary | Login |
| **Rewards**| `GET` | `/rewards/points` | Cek total saldo & riwayat masa aktif poin | Customer |
| | `GET` | `/rewards/coupons` | Daftar kupon diskon sistem (`WELCOME-xxx`) | Customer |
| | `GET` | `/rewards/coupons/:code/validate` | Validasi status & kepemilikan kupon | Customer |

---

## 🛠️ Daftar Perintah Berguna (Cheatsheet)

| `bun dev`                                         | Menjalankan server dalam mode _watch_ (auto-reload saat ada perubahan kode)                                      |
| `bun test`                                        | Menjalankan seluruh test suite                                                                                   |
| `bun run lint`                                    | Menjalankan OXLint untuk cek kualitas kode                                                                       |
| `bunx knip`                                       | Mendeteksi unused exports, files, dan dependencies di seluruh project                                            |
| `bunx prisma migrate dev --name <nama-perubahan>` | Membuat file migrasi dari perubahan schema.prisma, lalu menerapkannya ke database (workflow utama)               |
| `bunx prisma generate`                            | Men-generate ulang TypeScript client setiap kali `schema.prisma` diubah                                          |
| `bunx prisma migrate deploy`                      | Menerapkan migrasi yang belum jalan, tanpa membuat migrasi baru (setelah pull dari GitHub, dan untuk production) |
| `bunx prisma migrate reset`                       | Reset database development: hapus semua data, lalu terapkan ulang semua migrasi dari awal                        |
| `bunx prisma db push`                             | Sinkronisasi schema model di `schema.prisma` langsung ke database Neon                                           |
| `bunx prisma studio`                              | Membuka web GUI visual untuk melihat dan mengedit data di browser                                                |

---

## 🔍 Code Quality Tools

| Tool | Deskripsi |
| :--- | :-------- |
| **[OXLint](https://oxc.rs/docs/guide/usage/linter)** | Linter cepat berbasis Rust untuk TypeScript/JavaScript |
| **[Knip](https://knip.dev)** | Mendeteksi unused exports, unused files, dan unused `package.json` dependencies secara project-wide |

```bash
# Cek unused code di seluruh project
bunx knip
```



## 🐳 Menjalankan dengan Docker

Kamu bisa menjalankan aplikasi di dalam container Docker lokal menggunakan Docker Compose:

```bash
# 1. Build dan jalankan container di background
docker compose up -d --build

# 2. Cek status container & healthcheck
docker compose ps

# 3. Lihat log aplikasi
docker compose logs -f

# 4. Hentikan container
docker compose down
```

## 📁 Struktur Direktori

```text
├── prisma/
│   ├── models/               # Definisi model modular (user, reward, coupon)
│   └── schema.prisma         # Konfigurasi generator & datasource
├── public/                   # Asset publik statis
├── src/
│   ├── configs/              # Konfigurasi aplikasi (app, mail, session, cloudinary)
│   ├── controllers/          # Handler logika request & response
│   ├── db/
│   │   └── index.ts          # Inisialisasi koneksi Prisma Client & Neon adapter
│   ├── docs/                 # Spesifikasi OpenAPI & Swagger UI
│   ├── errors/               # Custom application error classes (AppError, 401, 403, 404, dll)
│   ├── generated/            # Output Prisma Client (auto-generated, gitignored)
│   ├── interfaces/           # Tipe data & DTO TypeScript
│   ├── libs/                 # Utility external library (logger, mailer)
│   ├── middlewares/          # Express middlewares (auth, errorHandler, rateLimiter, upload)
│   ├── routes/               # Definisi router Express & endpoint API
│   ├── services/             # Logika bisnis (auth, user, reward, cloudinary)
│   ├── utils/                # Utility helper (image compression, response formatting, otp)
│   ├── validations/          # Validasi skema Zod (auth, user)
│   └── app.ts                # Express application entry point
├── tests/                    # Unit & integration test suites (Bun test)
├── .env.example              # Template environment variables
├── package.json
└── tsconfig.json
```
