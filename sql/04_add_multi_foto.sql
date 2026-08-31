-- ============================================================
-- TAMBAHAN: dukungan foto lebih dari satu per laporan
-- Jalankan file ini di Supabase SQL Editor (New query → paste → Run).
-- Cukup dijalankan SEKALI, setelah schema.sql (dan setelah
-- add_rekap_read_policy.sql kalau sudah dijalankan duluan).
-- ============================================================

-- Sebelumnya 1 laporan cuma bisa punya 1 foto (kolom laporan.foto_url).
-- Sekarang foto disimpan di tabel terpisah supaya 1 laporan bisa
-- punya banyak foto (dari kamera maupun upload galeri).

create table if not exists public.laporan_foto (
  id uuid primary key default gen_random_uuid(),
  laporan_id uuid not null references public.laporan(id) on delete cascade,
  foto_url text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_laporan_foto_laporan_id on public.laporan_foto(laporan_id);

alter table public.laporan_foto enable row level security;

-- Sama seperti tabel laporan: siapa saja boleh insert (submit form dari
-- browser), dan boleh baca (dibutuhkan halaman rekap.html untuk
-- menampilkan link foto).
drop policy if exists "laporan_foto insertable by anyone" on public.laporan_foto;
create policy "laporan_foto insertable by anyone" on public.laporan_foto
  for insert with check (true);

drop policy if exists "laporan_foto readable by anyone" on public.laporan_foto;
create policy "laporan_foto readable by anyone" on public.laporan_foto
  for select using (true);

-- CATATAN: kolom laporan.foto_url (lama, isi 1 link) tetap dibiarkan
-- ada supaya data laporan lama yang sudah masuk tidak hilang linknya.
-- Laporan baru akan pakai tabel laporan_foto ini, bukan kolom itu lagi.
