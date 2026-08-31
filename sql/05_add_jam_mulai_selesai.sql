-- ---------- GANTI KOLOM "jam" JADI "jam_mulai" + "jam_selesai" ----------
-- Jalankan ini kalau tabel public.laporan masih pakai kolom lama "jam"
-- (satu jam saja). Setelah migrasi ini, form input laporan minta Jam
-- Mulai dan Jam Selesai secara terpisah.

alter table public.laporan add column if not exists jam_mulai time;
alter table public.laporan add column if not exists jam_selesai time;

-- Isi data lama: jam_mulai & jam_selesai sama-sama diisi dari kolom
-- "jam" yang lama, supaya tidak ada baris kosong.
-- Dibungkus DO block + cek information_schema supaya aman dijalankan
-- ulang (kolom "jam" sudah di-drop di akhir file ini pada run pertama).
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'laporan' and column_name = 'jam'
  ) then
    update public.laporan set jam_mulai = jam where jam_mulai is null and jam is not null;
    update public.laporan set jam_selesai = jam where jam_selesai is null and jam is not null;
  end if;
end $$;

-- Jaga-jaga kalau ada baris yang masih kosong (mis. kolom "jam" dulu
-- juga kosong): isi dengan 00:00 supaya kolom bisa dijadikan NOT NULL.
update public.laporan set jam_mulai = '00:00' where jam_mulai is null;
update public.laporan set jam_selesai = '00:00' where jam_selesai is null;

alter table public.laporan alter column jam_mulai set not null;
alter table public.laporan alter column jam_selesai set not null;

alter table public.laporan drop column if exists jam;
