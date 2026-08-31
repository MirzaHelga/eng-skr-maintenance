-- ============================================================
-- MODUL: Audit Log
-- Jalankan setelah add_delete_policy.sql (urutan terakhir).
--
-- Mencatat aktivitas penting yang dilakukan lewat aplikasi ini:
--   - login berhasil / gagal, logout
--   - kelola user: tambah, ubah data, reset password, aktifkan/nonaktifkan
--   - draft: approve / reject (laporan, checklist PM, checklist Production)
--   - bersihkan data: hapus permanen
--
-- Data aktor (siapa yang melakukan) disimpan sebagai teks langsung
-- (bukan foreign key ke app_user) supaya riwayat tetap jelas/utuh
-- walaupun akun itu nanti dinonaktifkan atau diubah datanya — sama
-- seperti pola `reviewed_by` di tabel `laporan`/`pm_checklist_submission`.
-- ============================================================

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor_id uuid,
  actor_username text,
  actor_nama text,
  actor_role text,
  action text not null,
  entity_type text,
  entity_id text,
  entity_label text,
  detail text
);

create index if not exists idx_audit_log_created_at on public.audit_log(created_at desc);
create index if not exists idx_audit_log_action on public.audit_log(action);
create index if not exists idx_audit_log_entity_type on public.audit_log(entity_type);

alter table public.audit_log enable row level security;

-- ---------- CATATAN KEAMANAN ----------
-- Sama seperti tabel lain di app ini: pembatasan "cuma superadmin yang
-- boleh BUKA halaman Audit Log" ditegakkan di sisi tampilan
-- (data-allow="superadmin" di audit-log.html), bukan di RLS — siapa pun
-- yang pegang Project URL + anon key tetap bisa query tabel ini langsung
-- lewat API, di luar aplikasi ini.
--
-- Yang beda dari tabel lain: audit_log SENGAJA tidak dikasih policy
-- UPDATE maupun DELETE sama sekali (hanya SELECT + INSERT). Jadi lewat
-- aplikasi ini, baris yang sudah tercatat tidak bisa diubah/dihapus —
-- supaya riwayatnya tetap bisa dipercaya sebagai jejak audit.
drop policy if exists "audit_log readable by anyone" on public.audit_log;
create policy "audit_log readable by anyone" on public.audit_log
  for select using (true);
drop policy if exists "audit_log insertable by anyone" on public.audit_log;
create policy "audit_log insertable by anyone" on public.audit_log
  for insert with check (true);
