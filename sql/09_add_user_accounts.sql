-- ============================================================
-- MODUL: Akun & Superadmin
-- Jalankan setelah add_draft_workflow.sql.
--
-- Sebelumnya app cuma pakai 2 password bareng (Operator/SPV). Mulai
-- modul ini, login pakai AKUN PER ORANG (username + password) yang
-- disimpan di tabel `app_user`. Ada 3 role:
--   - operator    : input laporan & checklist PM
--   - spv         : semua hak operator + rekap, draft/review, dashboard
--   - superadmin  : semua hak spv + kelola akun (tambah/ubah/nonaktifkan
--                    user) lewat halaman "Kelola User" (menyusul di
--                    modul berikutnya)
--
-- Password TIDAK disimpan plain text — disimpan sebagai hash SHA-256
-- yang dihitung di browser (Web Crypto API) sebelum dikirim ke sini.
-- ============================================================

create table if not exists public.app_user (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  nama text,
  role text not null check (role in ('operator', 'spv', 'superadmin')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_app_user_username on public.app_user(username);

alter table public.app_user enable row level security;

-- ---------- CATATAN KEAMANAN ----------
-- Sama seperti tabel lain di app ini (lihat add_draft_workflow.sql):
-- app masih pakai anon key tanpa Supabase Auth per user, jadi
-- pembatasan "cuma superadmin yang boleh kelola akun" ditegakkan di
-- SISI TAMPILAN (role gate di js/auth.js), BUKAN di RLS. Siapa pun
-- yang pegang Project URL + anon key kamu tetap bisa baca/ubah tabel
-- ini langsung lewat API. Kalau nanti butuh proteksi level database
-- yang lebih kuat (akun beneran lewat Supabase Auth + RLS berbasis
-- user), tinggal bilang — bisa dibantu migrasi.
drop policy if exists "app_user readable by anyone" on public.app_user;
create policy "app_user readable by anyone" on public.app_user
  for select using (true);
drop policy if exists "app_user insertable by anyone" on public.app_user;
create policy "app_user insertable by anyone" on public.app_user
  for insert with check (true);
drop policy if exists "app_user updatable by anyone" on public.app_user;
create policy "app_user updatable by anyone" on public.app_user
  for update using (true) with check (true);
drop policy if exists "app_user deletable by anyone" on public.app_user;
create policy "app_user deletable by anyone" on public.app_user
  for delete using (true);

-- ---------- AKUN SUPERADMIN DEFAULT ----------
-- Username : admin
-- Password : admin123   (GANTI SEGERA setelah bisa login — fitur ganti
--            password akan tersedia di halaman "Kelola User" pada
--            modul berikutnya; untuk sementara ganti manual lewat SQL
--            Editor kalau perlu, dengan hash SHA-256 password baru)
-- Hash di bawah = SHA-256("admin123") dalam hex.
insert into public.app_user (username, password_hash, nama, role)
values ('admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'Superadmin', 'superadmin')
on conflict (username) do nothing;
