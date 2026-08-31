-- ============================================================
-- TAMBAHAN: izin baca tabel laporan (untuk halaman rekap.html)
-- Jalankan file ini di Supabase SQL Editor (New query → paste → Run).
-- Cukup dijalankan SEKALI, setelah schema.sql.
-- ============================================================

-- Sebelumnya tabel laporan hanya bisa di-insert (submit form), tidak bisa
-- dibaca dari browser. Halaman rekap butuh baca data, jadi kita tambahkan
-- policy select publik (read-only) — sama seperti area/mesin/equipment.
--
-- CATATAN: ini bikin data laporan bisa dibaca siapa saja yang punya
-- Project URL + anon key kamu (sama seperti form input sekarang juga
-- publik tanpa login). Halaman rekap.html sendiri dikunci pakai
-- password sederhana di sisi tampilan, tapi itu bukan pengaman data di
-- level database. Kalau nanti butuh proteksi yang lebih kuat, tinggal
-- minta dibantu tambahkan Supabase Auth beneran.
drop policy if exists "laporan readable by anyone" on public.laporan;
create policy "laporan readable by anyone" on public.laporan
  for select using (true);
