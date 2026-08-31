-- ============================================================
-- MODUL: Lubrication — foto per titik lubrikasi (bukan per submission)
-- Jalankan file ini di Supabase SQL Editor, SETELAH
-- sql/16_add_lubrication_kategori_frekuensi.sql.
--
-- PERUBAHAN: sebelumnya foto evidence cuma nempel ke 1 submission
-- (1 checklist boleh punya banyak foto, tapi nggak jelas foto yang
-- mana punya titik yang mana). Sekarang tiap titik lubrikasi punya
-- tombol foto sendiri-sendiri, jadi lubrication_checklist_foto perlu
-- tahu foto itu punya titik yang mana.
--
-- item_no    -> nomor titik ASLI dari data sumber (js/lubrication-data.js),
--               misal "3a" — dipakai buat query/join kalau perlu.
-- item_titik -> snapshot nama titiknya saat difoto, misal "Top Cooker
--               Rotor" — biar rekap gampang nampilinnya tanpa perlu
--               lookup ulang ke data statis.
--
-- Foto lama (sebelum migrasi ini) otomatis NULL di kedua kolom ini —
-- rekap akan nampilin foto lama itu di bagian "Foto lain" (belum
-- terhubung ke titik manapun).
--
-- File ini AMAN dijalankan berkali-kali (idempotent).
-- ============================================================

alter table public.lubrication_checklist_foto
  add column if not exists item_no text;

alter table public.lubrication_checklist_foto
  add column if not exists item_titik text;

create index if not exists idx_lubrication_checklist_foto_item_no
  on public.lubrication_checklist_foto(submission_id, item_no);
