-- ============================================================
-- MODUL: Panduan (file attachment) per form
-- Jalankan setelah sql/20_add_multi_role.sql.
--
-- Superadmin & HOD Engineering bisa upload file panduan (PDF/gambar/
-- dokumen apa saja) untuk tiap form input (Report, Checklist Utility,
-- Checklist Production, Checklist Lubrication). File-nya disimpan
-- permanen (Supabase Storage + tabel ini), tampil ke operator di atas
-- form terkait sebagai referensi sebelum mereka isi. Bisa lebih dari 1
-- file per form, dan superadmin/HOD bisa tambah/ubah/hapus kapan saja
-- (CRUD penuh).
--
-- Sama seperti tabel lain di app ini: app masih pakai anon key (bukan
-- Supabase Auth), jadi pembatasan "siapa yang boleh upload/hapus"
-- ditegakkan di sisi tampilan (role gate di js/panduan.js — cuma
-- superadmin & hod_engineering yang lihat tombol kelola), bukan di
-- RLS. Lihat catatan yang sama di sql/09_add_user_accounts.sql &
-- sql/19_add_role_permission_matrix.sql.
-- ============================================================

create table if not exists public.form_panduan (
  id uuid primary key default gen_random_uuid(),
  -- form_key sesuai key module di js/auth.js (PERMISSIONS):
  -- 'reports' (laporan.html), 'utility' (checklist.html),
  -- 'production' (production-checklist.html), 'lubrication'
  -- (lubrication-checklist.html).
  form_key text not null check (form_key in ('reports', 'utility', 'production', 'lubrication')),
  judul text not null,
  file_name text not null,
  file_path text not null,
  file_url text not null,
  file_size bigint,
  uploaded_by_id uuid,
  uploaded_by_nama text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_form_panduan_form_key on public.form_panduan(form_key);

alter table public.form_panduan enable row level security;

drop policy if exists "form_panduan readable by anyone" on public.form_panduan;
create policy "form_panduan readable by anyone" on public.form_panduan
  for select using (true);

drop policy if exists "form_panduan insertable by anyone" on public.form_panduan;
create policy "form_panduan insertable by anyone" on public.form_panduan
  for insert with check (true);

drop policy if exists "form_panduan updatable by anyone" on public.form_panduan;
create policy "form_panduan updatable by anyone" on public.form_panduan
  for update using (true) with check (true);

drop policy if exists "form_panduan deletable by anyone" on public.form_panduan;
create policy "form_panduan deletable by anyone" on public.form_panduan
  for delete using (true);

-- ---------- STORAGE BUCKET UNTUK FILE PANDUAN ----------
-- Bucket terpisah dari bucket foto evidence, isinya bisa PDF/Word/
-- gambar dsb, bukan cuma foto.

insert into storage.buckets (id, name, public)
values ('panduan-form', 'panduan-form', true)
on conflict (id) do nothing;

drop policy if exists "panduan form bisa diupload siapa saja" on storage.objects;
create policy "panduan form bisa diupload siapa saja"
on storage.objects for insert
to public
with check (bucket_id = 'panduan-form');

drop policy if exists "panduan form bisa dibaca siapa saja" on storage.objects;
create policy "panduan form bisa dibaca siapa saja"
on storage.objects for select
to public
using (bucket_id = 'panduan-form');

drop policy if exists "panduan form bisa dihapus siapa saja" on storage.objects;
create policy "panduan form bisa dihapus siapa saja"
on storage.objects for delete
to public
using (bucket_id = 'panduan-form');

drop policy if exists "panduan form bisa diupdate siapa saja" on storage.objects;
create policy "panduan form bisa diupdate siapa saja"
on storage.objects for update
to public
using (bucket_id = 'panduan-form')
with check (bucket_id = 'panduan-form');
