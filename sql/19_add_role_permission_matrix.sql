-- ============================================================
-- MODUL: Role & Permission Matrix (per departemen)
-- Jalankan setelah add_user_presence.sql (14) dan modul-modul
-- setelahnya (15-18).
--
-- Sebelumnya app cuma punya 3 role generik: operator, spv,
-- superadmin — semua operator/SPV bisa lihat ketiga departemen
-- (Utility/Production/Lubrication) sekaligus.
--
-- Mulai modul ini, akses dipecah per departemen sesuai dokumen
-- "Role and Permissions", jadi total 8 role:
--   - operator_utility      : input checklist PM Utility only
--   - operator_production   : input checklist Production only
--   - operator_lubrication  : input checklist Lubrication only
--   - spv_utility            : operator_utility + Dashboard, Trend,
--                              QR Code, Riwayat Mesin, Draft, Export
--                              Data
--   - spv_production         : sama seperti spv_utility, tapi untuk
--                              departemen Production
--   - spv_lubrication        : sama seperti spv_utility, tapi untuk
--                              departemen Lubrication
--   - hod_engineering        : semua departemen + Kelola User +
--                              Bersihkan Data (TANPA Online Sekarang
--                              & Audit Log)
--   - superadmin             : semua modul tanpa kecuali
--
-- Hak akses per halaman/menu ditegakkan di SISI TAMPILAN
-- (lihat PERMISSIONS di js/auth.js), sama seperti pembatasan role
-- sebelumnya — BUKAN di RLS (lihat catatan keamanan di
-- 09_add_user_accounts.sql, masih berlaku).
-- ============================================================

-- Lepas constraint role lama, ganti dengan yang mengizinkan 8 role
-- baru DITAMBAH role lama ('operator', 'spv') supaya baris historis
-- yang sudah ada tidak melanggar constraint (baris itu dinonaktifkan
-- di bawah, bukan dihapus atau dipaksa pindah departemen yang kita
-- tidak tahu).
alter table public.app_user drop constraint if exists app_user_role_check;
alter table public.app_user add constraint app_user_role_check
  check (role in (
    'operator_utility',
    'operator_production',
    'operator_lubrication',
    'spv_utility',
    'spv_production',
    'spv_lubrication',
    'hod_engineering',
    'superadmin',
    -- legacy, dipertahankan hanya untuk baris lama yang dinonaktifkan
    'operator',
    'spv'
  ));

-- ---------- NONAKTIFKAN AKUN LAMA ----------
-- Akun dengan role generik lama ('operator'/'spv') tidak lagi punya
-- padanan otomatis ke departemen tertentu, jadi dinonaktifkan di sini.
-- Superadmin tinggal buat ulang akun per orang lewat halaman "Kelola
-- User" dengan role baru yang sesuai departemennya masing-masing.
update public.app_user
set is_active = false,
    updated_at = now()
where role in ('operator', 'spv')
  and is_active = true;
