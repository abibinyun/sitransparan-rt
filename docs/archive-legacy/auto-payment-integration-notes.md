# Catatan Rencana Integrasi Auto-Payment & Solusi Listener Tanpa HP Fisik

**Tanggal:** 2026-09-27  
**Status:** Backlog / Ide Masa Depan  
**Referensi Repo Sumber:** `/home/abibinyun/data/LATIHAN/auto-payment`

---

## 1. Konsep Dasar & Integrasi ke Platform-RT

Repo `auto-payment` memungkinkan penerbitan QRIS dinamis mandiri (inject tag EMVCo `54` nominal + kode unik) dan pencocokan mutasi otomatis via notifikasi rekening.

### Alur Integrasi:
1. **Frontend Platform-RT**:
   - Warga pilih bayar iuran via QRIS.
   - Platform-RT memanggil API `auto-payment` untuk buat invoice dengan `externalId = dues_payment_id`.
   - QRIS dinamis ber-nominal ditampilkan ke warga.
2. **Backend Platform-RT**:
   - Menyediakan webhook endpoint: `POST /api/v1/webhooks/auto-payment`.
   - Validasi signature HMAC SHA-256 (`x-signature`).
   - Eksekusi auto-verify iuran: `VerifyDuesPayment(..., "verified", systemUserID)` dan catat transaksi kas masuk.

---

## 2. Masalah Ketergantungan HP Fisik & Solusi Alternatif

Mengoperasikan HP fisik standby 24 jam memiliki risiko baterai menggelembung, koneksi Wi-Fi sleep, dan biaya perangkat tambahan.

### Alternatif 1: Email Notification Listener (Rekomendasi Utama)
- **Cara Kerja**: Bank/e-wallet selalu mengirim email bukti transfer masuk (BCA, Mandiri, BRI, GoPay, Dana). Backend menjalankan service IMAP IDLE yang memantau inbox email RT secara real-time.
- **Kelebihan**:
  - Nol konsumsi daya HP fisik.
  - Sangat ringan di server (RAM ~50MB, CPU 0%).
  - Bebas risiko deteksi emulator / anti-root bank.

### Alternatif 2: Container Android Virtual (Redroid di Docker)
- **Cara Kerja**: Menjalankan OS Android virtual di dalam container Linux menggunakan `redroid/redroid`.
- **Karakteristik & Konsumsi Resource**:
  - Headless mode (tanpa GUI aktif): RAM ~1.2–1.5 GB, CPU idle 5–10%.
  - Hardware PC Latitude 3350 (i3-5005U, RAM 16 GB, `/dev/kvm` aktif) memadai.
- **Setup Awal & Debugging**:
  1. Load kernel module binder di host OS:
     ```bash
     sudo modprobe binder_linux
     ```
  2. Jalankan container Redroid (port ADB 5555 diekspos).
  3. Konek ADB dari PC:
     ```bash
     adb connect localhost:5555
     ```
  4. Remote GUI Android lewat `scrcpy`:
     ```bash
     scrcpy -s localhost:5555
     ```
  5. Login akun bank/e-wallet merchant dan aktifkan izin `NotificationListenerService`.
  6. Tutup `scrcpy`, container tetap berjalan 24/7 di background server.
- **Catatan**: Aplikasi m-Banking tertentu memiliki proteksi SafetyNet/Root ketat; aplikasi e-wallet merchant (GoPay Merchant / Dana Bisnis) umumnya lebih fleksibel.
