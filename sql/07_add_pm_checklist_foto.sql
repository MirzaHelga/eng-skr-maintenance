-- ============================================================
-- TAMBAHAN: foto evidence untuk Checklist PM (bisa lebih dari 1)
-- Jalankan file ini di Supabase SQL Editor (New query → paste → Run).
-- Cukup dijalankan SEKALI, setelah add_pm_checklist.sql.
-- Pola sama persis dengan sql/add_multi_foto.sql (punyanya Laporan
-- Mesin) — 1 checklist bisa punya banyak foto lewat tabel terpisah.
-- ============================================================

create table if not exists public.pm_checklist_foto (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.pm_checklist_submission(id) on delete cascade,
  foto_url text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_pm_checklist_foto_submission_id on public.pm_checklist_foto(submission_id);

alter table public.pm_checklist_foto enable row level security;

-- Sama seperti tabel laporan_foto: siapa saja boleh insert (submit form
-- dari browser), dan boleh baca (dibutuhkan halaman rekap-pm.html &
-- draft.html untuk menampilkan foto).
drop policy if exists "pm_checklist_foto insertable by anyone" on public.pm_checklist_foto;
create policy "pm_checklist_foto insertable by anyone" on public.pm_checklist_foto
  for insert with check (true);

drop policy if exists "pm_checklist_foto readable by anyone" on public.pm_checklist_foto;
create policy "pm_checklist_foto readable by anyone" on public.pm_checklist_foto
  for select using (true);

-- ---------- STORAGE BUCKET UNTUK FOTO ----------
-- Bucket terpisah dari 'foto-laporan' supaya foto evidence checklist PM
-- gampang dibedakan/dikelola sendiri di Supabase Storage.

insert into storage.buckets (id, name, public)
values ('foto-checklist-pm', 'foto-checklist-pm', true)
on conflict (id) do nothing;

drop policy if exists "foto checklist pm bisa diupload siapa saja" on storage.objects;
create policy "foto checklist pm bisa diupload siapa saja"
on storage.objects for insert
to public
with check (bucket_id = 'foto-checklist-pm');

drop policy if exists "foto checklist pm bisa dibaca siapa saja" on storage.objects;
create policy "foto checklist pm bisa dibaca siapa saja"
on storage.objects for select
to public
using (bucket_id = 'foto-checklist-pm');
