-- ============================================================
-- MODUL: Perbaikan data karyawan
-- Jalankan SETELAH sql/21_add_form_panduan.sql
--
-- Masalah 1: Sukirman ke-insert 2x dengan NIK berbeda (6050644
-- lama vs 6050672 dari Employee_list.xlsx). Query di bawah hapus
-- duplikatnya, sisain yang NIK-nya sama seperti di
-- Employee_list.xlsx (6050672).
--
-- Masalah 2: Ahmad Saepuloh (Engineering, NIK 6050654) ada di
-- Employee_list.xlsx tapi kelewatan waktu seed awal, jadi belum
-- pernah masuk ke tabel ini.
--
-- File ini AMAN dijalankan berkali-kali.
-- ============================================================

delete from public.karyawan
where nama = 'Sukirman' and nik <> 6050672;

insert into public.karyawan (nik, nama, departemen) values
  (6050654, 'Ahmad Saepuloh', 'Engineering')
on conflict (nik) do nothing;
