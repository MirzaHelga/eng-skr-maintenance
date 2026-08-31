-- ============================================================
-- SCHEMA: Aplikasi Form Laporan Mesin
-- Jalankan file ini di Supabase SQL Editor SEBELUM seed_master_data.sql
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- MASTER DATA ----------

create table if not exists public.area (
  id uuid primary key default gen_random_uuid(),
  nama text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.mesin (
  id uuid primary key default gen_random_uuid(),
  area_id uuid not null references public.area(id) on delete cascade,
  nama text not null,
  created_at timestamptz not null default now(),
  unique (area_id, nama)
);

create table if not exists public.equipment (
  id uuid primary key default gen_random_uuid(),
  mesin_id uuid not null references public.mesin(id) on delete cascade,
  nama text not null,
  created_at timestamptz not null default now(),
  unique (mesin_id, nama)
);

create index if not exists idx_mesin_area_id on public.mesin(area_id);
create index if not exists idx_equipment_mesin_id on public.equipment(mesin_id);

-- ---------- LAPORAN (data yang diisi lewat form) ----------

create table if not exists public.laporan (
  id uuid primary key default gen_random_uuid(),
  area_id uuid not null references public.area(id),
  mesin_id uuid not null references public.mesin(id),
  equipment_id uuid not null references public.equipment(id),
  tanggal date not null,
  jam_mulai time not null,
  jam_selesai time not null,
  shift text not null check (shift in ('Shift 1', 'Shift 2', 'Shift 3')),
  status text not null check (status in ('Breakdown', 'Maintenance', 'Standby', 'Running')),
  deskripsi text not null,
  pic text not null,
  foto_url text,
  created_at timestamptz not null default now()
);

create index if not exists idx_laporan_tanggal on public.laporan(tanggal);
create index if not exists idx_laporan_area_id on public.laporan(area_id);

-- ---------- ROW LEVEL SECURITY ----------
-- Form ini dipakai tanpa login (pakai anon key). RLS diaktifkan supaya
-- hanya operasi yang memang dibutuhkan form yang diizinkan.

alter table public.area enable row level security;
alter table public.mesin enable row level security;
alter table public.equipment enable row level security;
alter table public.laporan enable row level security;

-- Master data: semua orang boleh baca (untuk isi dropdown)
drop policy if exists "area readable by anyone" on public.area;
create policy "area readable by anyone" on public.area
  for select using (true);
drop policy if exists "mesin readable by anyone" on public.mesin;
create policy "mesin readable by anyone" on public.mesin
  for select using (true);
drop policy if exists "equipment readable by anyone" on public.equipment;
create policy "equipment readable by anyone" on public.equipment
  for select using (true);

-- Laporan: semua orang boleh insert (submit form). Tidak ada select/update/delete
-- publik supaya data yang sudah masuk tidak bisa diubah/dihapus dari sisi client.
drop policy if exists "laporan insertable by anyone" on public.laporan;
create policy "laporan insertable by anyone" on public.laporan
  for insert with check (true);

-- ---------- STORAGE BUCKET UNTUK FOTO ----------
-- Jalankan bagian ini juga di SQL Editor (butuh Supabase, bukan Postgres biasa)

insert into storage.buckets (id, name, public)
values ('foto-laporan', 'foto-laporan', true)
on conflict (id) do nothing;

drop policy if exists "foto laporan bisa diupload siapa saja" on storage.objects;
create policy "foto laporan bisa diupload siapa saja"
on storage.objects for insert
to public
with check (bucket_id = 'foto-laporan');

drop policy if exists "foto laporan bisa dibaca siapa saja" on storage.objects;
create policy "foto laporan bisa dibaca siapa saja"
on storage.objects for select
to public
using (bucket_id = 'foto-laporan');
