-- ============================================================
-- MODUL: Draft & Review (Operator -> SPV)
-- Jalankan setelah schema.sql, add_pm_checklist.sql, add_multi_foto.sql.
--
-- Menambahkan status review ke laporan & checklist PM:
--   'draft'    -> baru disubmit operator, menunggu ditinjau SPV
--   'approved' -> sudah disetujui SPV
--   'rejected' -> ditolak SPV (dengan alasan)
--
-- Juga menambahkan tabel `notifikasi` sebagai kotak masuk notifikasi
-- in-app untuk SPV (dicek dari draft.html & lonceng notifikasi di topbar).
-- ============================================================

-- ---------- LAPORAN: kolom review ----------
alter table public.laporan
  add column if not exists review_status text not null default 'draft'
    check (review_status in ('draft', 'approved', 'rejected')),
  add column if not exists reviewed_by text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reject_reason text;

create index if not exists idx_laporan_review_status on public.laporan(review_status);

-- ---------- PM CHECKLIST: kolom review ----------
alter table public.pm_checklist_submission
  add column if not exists review_status text not null default 'draft'
    check (review_status in ('draft', 'approved', 'rejected')),
  add column if not exists reviewed_by text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reject_reason text;

create index if not exists idx_pm_checklist_review_status on public.pm_checklist_submission(review_status);

-- ---------- IZIN UPDATE (supaya SPV bisa approve/reject dari browser) ----------
-- Catatan: app ini masih pakai anon key + password bersama per role (bukan
-- Supabase Auth per user), jadi pembatasan "cuma SPV yang boleh approve"
-- ditegakkan di sisi tampilan (role gate), bukan di RLS. Siapa pun yang
-- pegang anon key + tahu password SPV bisa update lewat sini. Kalau nanti
-- butuh proteksi level database yang lebih kuat, ganti ke Supabase Auth.
drop policy if exists "laporan updatable by anyone" on public.laporan;
create policy "laporan updatable by anyone" on public.laporan
  for update using (true) with check (true);

drop policy if exists "pm checklist updatable by anyone" on public.pm_checklist_submission;
create policy "pm checklist updatable by anyone" on public.pm_checklist_submission
  for update using (true) with check (true);

-- ---------- NOTIFIKASI ----------
create table if not exists public.notifikasi (
  id uuid primary key default gen_random_uuid(),
  tipe text not null check (tipe in ('laporan', 'pm_checklist')),
  ref_id uuid not null,          -- id baris di tabel laporan / pm_checklist_submission
  judul text not null,
  pesan text,
  dibaca boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifikasi_dibaca on public.notifikasi(dibaca);
create index if not exists idx_notifikasi_created_at on public.notifikasi(created_at);

alter table public.notifikasi enable row level security;

drop policy if exists "notifikasi insertable by anyone" on public.notifikasi;
create policy "notifikasi insertable by anyone" on public.notifikasi
  for insert with check (true);
drop policy if exists "notifikasi readable by anyone" on public.notifikasi;
create policy "notifikasi readable by anyone" on public.notifikasi
  for select using (true);
drop policy if exists "notifikasi updatable by anyone" on public.notifikasi;
create policy "notifikasi updatable by anyone" on public.notifikasi
  for update using (true) with check (true);

-- ---------- CATATAN: notifikasi email (belum aktif) ----------
-- Tabel notifikasi di atas juga bisa jadi trigger untuk Supabase Edge
-- Function nanti (kirim email tiap ada insert baru), lewat Database
-- Webhook di Supabase Dashboard -> Database -> Webhooks, arahkan ke
-- Edge Function yang manggil layanan email (mis. Resend/SendGrid).
-- Belum dibuatkan sekarang karena belum ada kredensial layanan emailnya.
