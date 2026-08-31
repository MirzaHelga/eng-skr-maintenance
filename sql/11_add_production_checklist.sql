-- ============================================================
-- MODUL: Production (Maintenance Task List line produksi)
-- Jalankan file ini di Supabase SQL Editor (New query -> paste -> Run),
-- SETELAH sql/schema.sql, sql/add_draft_workflow.sql, dan
-- sql/add_user_accounts.sql.
--
-- Ini modul BARU yang terpisah dari Checklist PM (pm_checklist_submission),
-- dipakai oleh halaman production.html / production-checklist.html.
-- Datanya didefinisikan di js/production-data.js (mirip pola
-- js/checklist-data.js), sumbernya file Excel "Maintenance Task List"
-- per line produksi (Extrusion, Gummy, dst — ditambah bertahap).
--
-- Alurnya SAMA PERSIS dengan Checklist PM: submit = draft -> SPV
-- approve/reject di halaman draft.html -> masuk rekap-production.html.
-- Makanya kolom review_status/reviewed_by/reviewed_at/reject_reason
-- langsung dibikin dari awal (tidak perlu migrasi terpisah lagi).
-- ============================================================

create table if not exists public.production_checklist_submission (
  id uuid primary key default gen_random_uuid(),

  -- checklist_key merujuk ke id checklist di js/production-data.js,
  -- misal 'extruder-6-month'. Dipakai buat filter/rekap.
  checklist_key text not null,
  checklist_title text not null,     -- judul form saat diisi (snapshot)
  category_label text,               -- nama equipment/kategori, misal "Extruder"
  periode_label text not null,       -- "3 Month" / "6 Month" / "Yearly" / "Monthly" dst

  equipment text,                    -- isian bebas: nama/tipe equipment aktual di lapangan
  area text,
  bulan_tahun text,

  items jsonb not null,              -- array of { no, uraian, standar, hasil, keterangan }

  tanggal_inspeksi date not null,
  checked_by_opr text,
  checked_by_spv text,
  catatan text,

  review_status text not null default 'draft'
    check (review_status in ('draft', 'approved', 'rejected')),
  reviewed_by text,
  reviewed_at timestamptz,
  reject_reason text,

  created_at timestamptz not null default now()
);

create index if not exists idx_production_checklist_key on public.production_checklist_submission(checklist_key);
create index if not exists idx_production_checklist_tanggal on public.production_checklist_submission(tanggal_inspeksi);
create index if not exists idx_production_checklist_review_status on public.production_checklist_submission(review_status);

alter table public.production_checklist_submission enable row level security;

drop policy if exists "production checklist insertable by anyone" on public.production_checklist_submission;
create policy "production checklist insertable by anyone" on public.production_checklist_submission
  for insert with check (true);

drop policy if exists "production checklist readable by anyone" on public.production_checklist_submission;
create policy "production checklist readable by anyone" on public.production_checklist_submission
  for select using (true);

-- Izin update dipakai supaya SPV bisa approve/reject dari halaman draft.html
-- (sama seperti pm_checklist_submission & laporan — lihat catatan keamanan
-- di README.md soal ini belum pakai Supabase Auth per-user).
drop policy if exists "production checklist updatable by anyone" on public.production_checklist_submission;
create policy "production checklist updatable by anyone" on public.production_checklist_submission
  for update using (true) with check (true);


-- ---------- FOTO EVIDENCE (bisa lebih dari 1 per checklist) ----------
create table if not exists public.production_checklist_foto (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.production_checklist_submission(id) on delete cascade,
  foto_url text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_production_checklist_foto_submission_id on public.production_checklist_foto(submission_id);

alter table public.production_checklist_foto enable row level security;

drop policy if exists "production_checklist_foto insertable by anyone" on public.production_checklist_foto;
create policy "production_checklist_foto insertable by anyone" on public.production_checklist_foto
  for insert with check (true);

drop policy if exists "production_checklist_foto readable by anyone" on public.production_checklist_foto;
create policy "production_checklist_foto readable by anyone" on public.production_checklist_foto
  for select using (true);

-- ---------- STORAGE BUCKET UNTUK FOTO ----------
insert into storage.buckets (id, name, public)
values ('foto-production-checklist', 'foto-production-checklist', true)
on conflict (id) do nothing;

drop policy if exists "foto production checklist bisa diupload siapa saja" on storage.objects;
create policy "foto production checklist bisa diupload siapa saja"
on storage.objects for insert
to public
with check (bucket_id = 'foto-production-checklist');

drop policy if exists "foto production checklist bisa dibaca siapa saja" on storage.objects;
create policy "foto production checklist bisa dibaca siapa saja"
on storage.objects for select
to public
using (bucket_id = 'foto-production-checklist');


-- ---------- NOTIFIKASI: izinkan tipe 'production_checklist' ----------
-- Tabel notifikasi dibuat di add_draft_workflow.sql dengan constraint
-- tipe in ('laporan','pm_checklist'). Kita perluas supaya lonceng SPV
-- juga bisa menampilkan draft baru dari modul Production.
alter table public.notifikasi drop constraint if exists notifikasi_tipe_check;
alter table public.notifikasi
  add constraint notifikasi_tipe_check
  check (tipe in ('laporan', 'pm_checklist', 'production_checklist'));
