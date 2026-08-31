-- ============================================================
-- MODUL: Online Sekarang (presence + lokasi GPS terakhir, multi-device)
-- Jalankan setelah add_audit_log.sql (urutan terakhir).
--
-- Satu baris per DEVICE per akun (bukan cuma per akun) — kalau 1 akun
-- login di 2 HP sekaligus, keduanya tetap muncul sebagai baris
-- terpisah di halaman "Online Sekarang", tidak saling menimpa.
-- device_id = ID acak yang disimpan di localStorage browser, jadi
-- tetap sama tiap kali app dibuka dari device/browser yang sama
-- (beda device/browser = device_id beda).
--
-- CATATAN:
-- - Lokasi (latitude/longitude/accuracy) BOLEH kosong — kalau user
--   menolak izin lokasi di browser, app tetap kirim heartbeat tanpa
--   koordinat, jadi device itu tetap kelihatan "online" walau tanpa
--   titik di peta.
-- - "Online" dihitung di sisi tampilan (JS), bukan kolom terpisah:
--   updated_at yang masih dalam beberapa menit terakhir = online.
--
-- Kalau kamu sudah sempat menjalankan versi SEBELUMNYA dari file ini
-- (skema lama: 1 baris per akun, PK = user_id), tabel lama itu
-- di-DROP dulu di bawah lalu dibuat ulang dengan skema baru. Aman —
-- isinya cuma status online sementara, bukan data penting yang perlu
-- disimpan.
-- ============================================================

drop table if exists public.user_presence;

create table public.user_presence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_user(id) on delete cascade,
  device_id text not null,
  device_label text,
  username text not null,
  nama text,
  role text,
  halaman text,
  latitude double precision,
  longitude double precision,
  accuracy double precision,
  updated_at timestamptz not null default now(),
  unique (user_id, device_id)
);

create index if not exists idx_user_presence_updated_at on public.user_presence(updated_at desc);
create index if not exists idx_user_presence_user_id on public.user_presence(user_id);

alter table public.user_presence enable row level security;

-- ---------- CATATAN KEAMANAN ----------
-- Sama seperti tabel lain di app ini: pembatasan "cuma superadmin yang
-- boleh BUKA halaman Online Sekarang" ditegakkan di sisi tampilan
-- (data-allow="superadmin" di online.html), bukan di RLS — siapa pun
-- yang pegang Project URL + anon key tetap bisa query tabel ini langsung
-- lewat API, di luar aplikasi ini.
drop policy if exists "user_presence readable by anyone" on public.user_presence;
create policy "user_presence readable by anyone" on public.user_presence
  for select using (true);
drop policy if exists "user_presence insertable by anyone" on public.user_presence;
create policy "user_presence insertable by anyone" on public.user_presence
  for insert with check (true);
drop policy if exists "user_presence updatable by anyone" on public.user_presence;
create policy "user_presence updatable by anyone" on public.user_presence
  for update using (true);
drop policy if exists "user_presence deletable by anyone" on public.user_presence;
create policy "user_presence deletable by anyone" on public.user_presence
  for delete using (true);
