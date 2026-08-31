-- ============================================================
-- MODUL: Lubrication (checklist titik lubrikasi per line)
-- Jalankan file ini di Supabase SQL Editor (New query -> paste -> Run),
-- SETELAH sql/schema.sql dan sql/add_user_accounts.sql.
--
-- Ini modul BARU yang terpisah dari Checklist PM / Production, dipakai
-- oleh halaman lubrication.html / lubrication-checklist.html. Datanya
-- didefinisikan di js/lubrication-data.js (1 checklist tetap per Line
-- 1-4, sumbernya file "Fox's Lubrication" per line).
--
-- BEDA DENGAN Checklist PM/Production: modul ini SENGAJA TIDAK PAKAI
-- alur draft -> approval SPV. Begitu operator submit, data langsung
-- final dan langsung muncul di rekap (tab "Rekap Lubrication" di
-- lubrication.html) — makanya tabel ini TIDAK punya kolom
-- review_status/reviewed_by/reviewed_at/reject_reason, dan submission
-- lubrication TIDAK dikirim ke tabel notifikasi/lonceng SPV maupun
-- halaman Draft.
-- ============================================================

create table if not exists public.lubrication_checklist_submission (
  id uuid primary key default gen_random_uuid(),

  -- line_key merujuk ke key di js/lubrication-data.js: "1"/"2"/"3"/"4".
  line_key text not null,
  line_label text not null,          -- snapshot label line saat diisi, misal "Line 1"

  bulan_tahun text,

  items jsonb not null,              -- array of { no, titik, lubricant, frekuensi,
                                      --   statusMesin, metode, estimasiQty, critical,
                                      --   dilakukan, qtyAktual, keterangan }

  tanggal_inspeksi date not null,
  checked_by_opr text,
  catatan text,

  created_at timestamptz not null default now()
);

create index if not exists idx_lubrication_checklist_line on public.lubrication_checklist_submission(line_key);
create index if not exists idx_lubrication_checklist_tanggal on public.lubrication_checklist_submission(tanggal_inspeksi);

alter table public.lubrication_checklist_submission enable row level security;

drop policy if exists "lubrication checklist insertable by anyone" on public.lubrication_checklist_submission;
create policy "lubrication checklist insertable by anyone" on public.lubrication_checklist_submission
  for insert with check (true);

drop policy if exists "lubrication checklist readable by anyone" on public.lubrication_checklist_submission;
create policy "lubrication checklist readable by anyone" on public.lubrication_checklist_submission
  for select using (true);

-- Tidak ada policy update/delete lewat browser di sini (beda dengan
-- laporan/PM/Production yang butuh update buat approve/reject) — kalau
-- nanti halaman "Bersihkan Data" mau bisa hapus data lubrication lama
-- juga, tinggal tambah policy delete + masukkan tabel ini ke
-- js/bersihkan-data.js (lihat sql/add_delete_policy.sql sebagai contoh).


-- ---------- FOTO EVIDENCE (bisa lebih dari 1 per checklist) ----------
create table if not exists public.lubrication_checklist_foto (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.lubrication_checklist_submission(id) on delete cascade,
  foto_url text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_lubrication_checklist_foto_submission_id on public.lubrication_checklist_foto(submission_id);

alter table public.lubrication_checklist_foto enable row level security;

drop policy if exists "lubrication_checklist_foto insertable by anyone" on public.lubrication_checklist_foto;
create policy "lubrication_checklist_foto insertable by anyone" on public.lubrication_checklist_foto
  for insert with check (true);

drop policy if exists "lubrication_checklist_foto readable by anyone" on public.lubrication_checklist_foto;
create policy "lubrication_checklist_foto readable by anyone" on public.lubrication_checklist_foto
  for select using (true);

-- ---------- STORAGE BUCKET UNTUK FOTO ----------
insert into storage.buckets (id, name, public)
values ('foto-lubrication-checklist', 'foto-lubrication-checklist', true)
on conflict (id) do nothing;

drop policy if exists "foto lubrication checklist bisa diupload siapa saja" on storage.objects;
create policy "foto lubrication checklist bisa diupload siapa saja"
on storage.objects for insert
to public
with check (bucket_id = 'foto-lubrication-checklist');

drop policy if exists "foto lubrication checklist bisa dibaca siapa saja" on storage.objects;
create policy "foto lubrication checklist bisa dibaca siapa saja"
on storage.objects for select
to public
using (bucket_id = 'foto-lubrication-checklist');
