# Cizquake Dashboard

Aplikasi web mobile untuk laporan dan rekap operasional cabang Cizquake, pengganti laporan lewat grup WhatsApp.

## Fitur

**Karyawan cabang** (login dengan username + password, cabang ditentukan admin)

- Beranda: stok terkini mini box dan medium box, kiriman yang menunggu, status absen, laporan hari ini.
- Absen: check in / check out per shift, jam dicatat otomatis oleh server (WIB).
- Stok: update stok dan daftar "perlu restock", konfirmasi penerimaan kiriman, kirim barang ke cabang lain.
- Laporan harian: stok awal, stok masuk, terjual per channel (Shopee, Grab, GoFood, offline, upselling, repeat order),
  uang masuk QRIS/cash, sisa stok, uang cash dan saldo GoPay, catatan.

**Admin**

- Ringkasan per tanggal, diperbarui otomatis: total terjual, upselling, uang masuk, dan kartu tiap cabang
  (stok, siapa yang sedang jaga, laporan, perlu restock).
- Rekap absensi per karyawan (jumlah hari, total jam), koreksi jam, unduh CSV.
- Rekap penjualan per channel, per cabang, per hari, unduh CSV.
- Pengiriman barang ke cabang dan status konfirmasinya.
- Kelola akun karyawan, cabang, dan koreksi stok.

## Menjalankan di komputer

```bash
npm install
npm run dev
```

Buka http://localhost:3000. Tanpa `DATABASE_URL`, data disimpan di folder `.data/` (Postgres tertanam, hanya untuk percobaan).
Saat pertama dibuka, aplikasi meminta pembuatan akun admin pertama.

## Memasang online (Vercel + Neon, gratis)

1. Buka vercel.com, login dengan GitHub, pilih **Add New → Project**, lalu impor repo ini dan tekan **Deploy**.
2. Di project Vercel, buka tab **Storage → Create Database → Neon (Postgres)** dan hubungkan ke project.
   Vercel otomatis mengisi variabel `DATABASE_URL`.
3. Buka tab **Deployments**, pilih deployment terakhir, lalu **Redeploy**.
4. Buka alamat aplikasinya, buat akun admin, lalu tambahkan akun karyawan di menu **Kelola**.

Tabel database dibuat otomatis saat aplikasi pertama kali menyala.

## Teknologi

Next.js (App Router), React, Tailwind CSS, Postgres. Semua logika server ada di `lib/api.ts`, skema di `lib/schema.ts`.
