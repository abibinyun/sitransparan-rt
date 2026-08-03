-- Migration 000008: Seed public sample announcements, documents, and aspirations
INSERT INTO announcements (id, tenant_id, title, content, target, attachment_url, created_at, updated_at)
VALUES 
  ('a1111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000010', 'Laporan Pertanggungjawaban Kas RT 05 Bulan Juli 2026', 'Berikut disampaikan rincian penerimaan iuran bulanan warga dan pengeluaran operasional kebersihan serta keamanan lingkungan RT 05 bulan Juli 2026. Laporan lengkap PDF dapat diunduh pada lampiran.', 'all', 'https://example.com/laporan-jul-2026.pdf', NOW(), NOW()),
  ('a2222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000010', 'Himbauan Kerja Bakti Massal & Fogging Pencegahan DBD', 'Diberitahukan kepada seluruh warga RT 05 bahwa Kerja Bakti akan dilaksanakan pada Hari Minggu jam 07.30 WIB. Diharapkan partisipasi setiap rumah.', 'all', NULL, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO documents (id, tenant_id, title, category, file_url, created_at, updated_at)
VALUES 
  ('d1111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000010', 'Peraturan & Tata Tertib Warga RT 05 / RW 02 Tahun 2026', 'letter', 'https://example.com/peraturan-rt05.pdf', NOW(), NOW()),
  ('d2222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000010', 'Notulen Hasil Musyawarah Warga Triwulan II', 'minutes', 'https://example.com/notulen-q2-2026.pdf', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO aspirations (id, tenant_id, resident_id, title, content, category, status, is_anonymous, response, created_at, updated_at)
VALUES
  ('a1111111-1111-1111-1111-111111111112', '00000000-0000-0000-0000-000000000010', NULL, 'Perbaikan Lampu Penerangan di Pertigaan Blok B', 'Mohon penerangan jalan di sekitar pertigaan Blok B diperbaiki karena lampu mati sejak 3 hari lalu dan gelap saat malam.', 'complaint', 'resolved', false, 'Lampu penerangan sudah diganti oleh tim keamanan & teknik RT pada tanggal 1 Agustus 2026.', NOW(), NOW()),
  ('a2222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000010', NULL, 'Usulan Penambahan Tempat Sampah Pilah Organik/Anorganik', 'Usul agar di dekat balai warga disediakan tempat pembuangan sampah terpisah untuk mendukung pilah sampah dari rumah.', 'suggestion', 'under_review', true, 'Terima kasih usulannya, sedang ditinjau pada seksi lingkungan hidup RT.', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO community_needs (id, tenant_id, title, description, estimated_cost, status, progress_notes, created_at, updated_at)
VALUES
  ('c1111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000010', 'Pengadaan Sound System Portable Balai Warga', 'Pengadaan sound system untuk kegiatan posyandu, arisan, dan rapat warga.', 3500000, 'approved', 'Sudah disetujui dalam rapat warga bulan Juli, proses pengadaan barang.', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
