# 🤖 Panduan Penggunaan Bot WhatsApp Otomatis

Selamat! Bot WhatsApp Anda telah berhasil dibuat. Ikuti langkah-langkah di bawah ini untuk menjalankannya.

## 📝 Persiapan (Prasyarat)
Pastikan Anda sudah menginstal:
1. **Node.js**: [Download di sini](https://nodejs.org/) (Rekomendasi versi LTS).
2. **NPM**: Sudah termasuk saat instal Node.js.

## 🚀 Cara Menjalankan Bot
1. Buka terminal atau Command Prompt (CMD) di folder proyek ini.
2. Jalankan perintah berikut untuk menginstal dependensi (jika belum):
   ```bash
   npm install
   ```
3. Jalankan bot dengan perintah:
   ```bash
   node index.js
   ```
4. Tunggu beberapa saat hingga **QR Code** muncul di terminal.
5. Buka aplikasi WhatsApp di HP Anda:
   - Pilih menu **Perangkat Tautan (Linked Devices)**.
   - Klik **Tautkan Perangkat**.
   - Scan QR Code yang muncul di terminal.
6. Jika terminal bertuliskan **"BOT WHATSAPP SIAP DIGUNAKAN!"**, maka bot sudah aktif.

## 📋 Daftar Perintah (Menu)
Bot ini merespon perintah-perintah berikut:
- `halo` atau `hi` - Sapaan awal.
- `/menu` - Menampilkan daftar menu utama.
- `/info` - Keterangan tentang bot.
- `/jam` - Menampilkan waktu saat ini (WIB).
- `/owner` - Kontak pemilik bot.
- `/quote` - Kata-kata bijak acak.
- `/ping` - Mengecek apakah bot masih aktif.

## 🌐 Menghidupkan Bot 24 Jam (Cloud/Hosting)

Jika ingin bot tetap aktif saat laptop dimatikan, ikuti langkah ini:

1. **Gunakan VPS (Ubuntu/Linux):**
   - Sewa VPS murah (Rekomendasi: DigitalOcean, Linode, atau VPS Lokal).
   - Masuk ke terminal VPS via SSH.
   - Install Node.js & Git: 
     ```bash
     curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
     sudo apt-get install -y nodejs git ffmpeg
     ```
   - Upload file bot Anda ke VPS.
   - Jalankan `npm install`.
   - Install **PM2** agar bot hidup selamanya: 
     ```bash
     sudo npm install pm2 -g
     pm2 start index.js --name habib-bot
     pm2 save
     pm2 startup
     ```

2. **Gunakan Panel Bot WhatsApp (Indo Hosting):**
   - Banyak penyedia lokal yang murah (mulai Rp10rb/bulan).
   - Akhi tinggal upload folder ini (zip lalu upload), lalu klik **Start**.
   - Scan QR lewat layar yang tersedia di panel tersebut.

---
Dibuat dengan ❤️ oleh NextGen Studio.
