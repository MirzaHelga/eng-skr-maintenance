-- ============================================================
-- MODUL: Multi-Role per Akun
-- Jalankan setelah add_role_permission_matrix.sql (19).
--
-- Sebelumnya 1 akun cuma bisa punya 1 role (kolom `role`, text
-- tunggal). Mulai modul ini, 1 akun bisa punya BEBERAPA role
-- sekaligus, bebas campur level & departemen (mis. Operator Utility
-- + SPV Production dalam 1 akun yang sama) — lewat kolom baru
-- `roles` (array text).
--
-- Kolom `role` (tunggal) TETAP DIPERTAHANKAN sebagai "role utama"
-- (yang aksesnya paling luas di antara semua role akun itu) — dipakai
-- untuk hal-hal yang memang cuma butuh 1 nilai, seperti warna label
-- di sidebar dan halaman default setelah login. Kolom ini di-sync
-- otomatis oleh aplikasi (js/auth.js) setiap kali role akun diubah
-- lewat Kelola User, jadi TIDAK PERLU diisi manual — cukup isi/ubah
-- `roles`.
-- ============================================================

alter table public.app_user
  add column if not exists roles text[] not null default '{}';

-- Backfill: akun yang sudah ada (role tunggal, dari sebelum modul ini)
-- otomatis dapat roles = [role].
update public.app_user
set roles = array[role]
where roles = '{}' and role is not null;

-- Pastikan setiap elemen di `roles` valid (role yang sama seperti
-- constraint kolom `role` di add_role_permission_matrix.sql, TANPA
-- role legacy 'operator'/'spv' karena akun lama itu sudah
-- dinonaktifkan dan tidak akan dipakai lagi untuk akun baru/edit).
alter table public.app_user drop constraint if exists app_user_roles_check;
alter table public.app_user add constraint app_user_roles_check
  check (
    roles <@ array[
      'operator_utility',
      'operator_production',
      'operator_lubrication',
      'spv_utility',
      'spv_production',
      'spv_lubrication',
      'hod_engineering',
      'superadmin'
    ]::text[]
  );

-- Setiap akun aktif harus punya minimal 1 role.
alter table public.app_user drop constraint if exists app_user_roles_not_empty;
alter table public.app_user add constraint app_user_roles_not_empty
  check (not is_active or array_length(roles, 1) > 0);

-- ---------- CATATAN KEAMANAN ----------
-- Sama seperti sebelumnya (lihat 09_add_user_accounts.sql) — app ini
-- masih pakai anon key tanpa Supabase Auth per user, jadi pembatasan
-- akses ditegakkan di SISI TAMPILAN (js/auth.js), bukan di RLS.
