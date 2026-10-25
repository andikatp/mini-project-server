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
cd mini-project-client
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
DATABASE_URL="postgresql://user:password@ep-xxxx.neon.tech/neondb?sslmode=require"
DATABASE_URL_POOLED="postgresql://user:password@ep-xxxx.neon.tech/pooled/neondb?sslmode=require"
```

### 4. Sinkronisasi Database & Generate Prisma Client

Jalankan sinkronisasi schema database ke Neon dan generate TypeScript types:

```bash
# 1. Dorong schema tabel ke database Neon
bun x prisma db push

# 2. Generate Prisma Client TypeScript
bun x prisma generate
```

### 5. Jalankan Development Server

```bash
bun dev
```

Server akan aktif di: **`http://localhost:5000`** 🚀

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
│   └── schema.prisma         # Definisi model & schema database
├── public/                   # Asset publik statis
├── src/
│   ├── configs/              # Konfigurasi aplikasi
│   ├── controllers/          # Handler logika request & response
│   ├── db/
│   │   └── index.ts          # Inisialisasi koneksi Prisma Client & Neon adapter
│   ├── generated/            # Output Prisma Client (auto-generated, gitignored)
│   ├── interfaces/           # Tipe data & DTO TypeScript
│   ├── libs/                 # Utility & helper function
│   ├── middlewares/          # Express middlewares (auth, error handler, dll)
│   ├── routes/               # Definisi endpoint API
│   ├── services/             # Logika bisnis (business logic)
│   ├── validations/          # Validasi skema input
│   └── app.ts                # Express application entry point
├── .env.example              # Template environment variables
├── package.json
└── tsconfig.json
```
