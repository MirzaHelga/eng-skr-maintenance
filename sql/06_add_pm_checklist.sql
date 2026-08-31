-- ============================================================
-- MODUL: Checklist PM (Preventive Maintenance)
-- Jalankan setelah schema.sql. Menyimpan hasil isian checklist
-- PM per equipment (mirip form Excel "Formulir Maintenance ...").
-- ============================================================

create table if not exists public.pm_checklist_submission (
  id uuid primary key default gen_random_uuid(),

  -- checklist_key merujuk ke id checklist di js/checklist-data.js,
  -- misal 'compressor-non-oil-free-weekly'. Dipakai buat filter/rekap.
  checklist_key text not null,
  checklist_title text not null,     -- judul form saat diisi (snapshot, biar histori ga berubah kalau judul di-edit belakangan)
  periode_label text not null,       -- "Weekly" / "Monthly" / "Yearly" / "2000 Hours" dst

  equipment text,                    -- isian bebas: "Kaeser BSD75 (SN 1324-970345)"
  area text,
  bulan_tahun text,                  -- isian bebas: "Desember 2025"

  items jsonb not null,              -- array of { no, uraian, standar, hasil, keterangan }

  tanggal_inspeksi date not null,
  checked_by_opr text,
  checked_by_spv text,
  catatan text,

  created_at timestamptz not null default now()
);

create index if not exists idx_pm_checklist_key on public.pm_checklist_submission(checklist_key);
create index if not exists idx_pm_checklist_tanggal on public.pm_checklist_submission(tanggal_inspeksi);

alter table public.pm_checklist_submission enable row level security;

drop policy if exists "pm checklist insertable by anyone" on public.pm_checklist_submission;
create policy "pm checklist insertable by anyone" on public.pm_checklist_submission
  for insert with check (true);

drop policy if exists "pm checklist readable by anyone" on public.pm_checklist_submission;
create policy "pm checklist readable by anyone" on public.pm_checklist_submission
  for select using (true);
