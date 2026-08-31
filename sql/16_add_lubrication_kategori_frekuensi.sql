-- ============================================================
-- MODUL: Lubrication — kolom kategori frekuensi per submission
-- Jalankan file ini di Supabase SQL Editor, SETELAH
-- sql/15_add_lubrication_draft_workflow.sql.
--
-- PERUBAHAN: checklist Lubrication sekarang dipecah per kategori
-- frekuensi (Shiftly / Mingguan / Bulanan / 3 Bulan / 6 Bulan /
-- Tahunan) — 1 line + 1 kategori = 1 form/submission sendiri, BUKAN
-- 1 line = 1 form isi semua titik sekaligus (lihat catatan baru di
-- js/lubrication-data.js & js/lubrication-checklist.js).
--
-- Kolom ini optional/nullable — cuma buat nyimpen kategori mana yang
-- lagi diisi, supaya nanti gampang difilter/ditampilkan di rekap.
-- Submission LAMA (sebelum migrasi ini) otomatis NULL di kedua kolom
-- ini karena waktu itu 1 submission masih berisi semua titik/kategori
-- sekaligus.
--
-- File ini AMAN dijalankan berkali-kali (idempotent).
-- ============================================================

alter table public.lubrication_checklist_submission
  add column if not exists kategori_frekuensi text;

alter table public.lubrication_checklist_submission
  add column if not exists kategori_frekuensi_label text;

create index if not exists idx_lubrication_checklist_kategori_frekuensi
  on public.lubrication_checklist_submission(kategori_frekuensi);
