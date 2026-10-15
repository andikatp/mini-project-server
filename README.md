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

| Perintah                | Deskripsi                                                                   |
| :---------------------- | :-------------------------------------------------------------------------- |
| `bun dev`               | Menjalankan server dalam mode _watch_ (auto-reload saat ada perubahan kode) |
| `bun x prisma generate` | Men-generate ulang TypeScript client setiap kali `schema.prisma` diubah     |
| `bun x prisma db push`  | Sinkronisasi schema model di `schema.prisma` langsung ke database Neon      |
| `bun x prisma studio`   | Membuka web GUI visual untuk melihat dan mengedit data di browser           |

---

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
