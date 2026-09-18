-- ============================================================
-- MODUL: Tambah field "Sparepart" di form Laporan Mesin
-- Jalankan SETELAH sql/22_fix_karyawan_duplikat.sql
--
-- Sparepart bersifat opsional (tidak semua laporan butuh
-- penggantian sparepart), jadi kolomnya nullable.
--
-- File ini AMAN dijalankan berkali-kali.
-- ============================================================

alter table public.laporan
  add column if not exists sparepart text;
