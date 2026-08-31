-- ============================================================
-- MODUL: Data Karyawan (Operator/PIC) — Engineering & Production
-- Jalankan SETELAH sql/17_add_lubrication_foto_item.sql (urutan
-- terakhir saat ini).
--
-- SEBAB ERROR "Gagal memuat data operator" di form Checklist,
-- Lubrication Checklist, Production Checklist, dan dropdown PIC di
-- Input Laporan: kode di js/app.js, js/checklist.js,
-- js/lubrication-checklist.js, js/production-checklist.js sudah query
-- ke tabel `karyawan`, tapi tabel ini belum pernah dibuat lewat
-- migrasi manapun. File ini membuat tabelnya + isi datanya dari
-- Employee_list.xlsx yang dikirim (185 orang: Production 157 +
-- Engineering 28, semua berstatus Active di data sumbernya).
--
-- Kalau nanti departemen lain juga perlu masuk dropdown Operator/PIC,
-- tinggal INSERT tambahan ke tabel ini (lihat contoh di paling bawah
-- file), TIDAK perlu ubah kode js.
--
-- File ini AMAN dijalankan berkali-kali (idempotent) — insert data
-- pakai ON CONFLICT (nik) DO NOTHING, jadi tidak akan dobel kalau
-- dijalankan ulang.
-- ============================================================

create table if not exists public.karyawan (
  id uuid primary key default gen_random_uuid(),
  nik bigint not null unique,
  nama text not null,
  departemen text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_karyawan_departemen on public.karyawan(departemen);

alter table public.karyawan enable row level security;

-- Sama seperti tabel lain di app ini (anon key, tanpa Supabase Auth
-- per user) — baca boleh siapa saja, tulis dijaga di sisi tampilan
-- (halaman Kelola User nanti kalau mau dibikinkan CRUD-nya).
drop policy if exists "karyawan readable by anyone" on public.karyawan;
create policy "karyawan readable by anyone" on public.karyawan
  for select using (true);
drop policy if exists "karyawan insertable by anyone" on public.karyawan;
create policy "karyawan insertable by anyone" on public.karyawan
  for insert with check (true);
drop policy if exists "karyawan updatable by anyone" on public.karyawan;
create policy "karyawan updatable by anyone" on public.karyawan
  for update using (true) with check (true);
drop policy if exists "karyawan deletable by anyone" on public.karyawan;
create policy "karyawan deletable by anyone" on public.karyawan
  for delete using (true);

-- ---------- SEED DATA (dari Employee_list.xlsx — Production & Engineering) ----------
insert into public.karyawan (nik, nama, departemen) values
  (6050265, 'Adhi Susilo', 'Engineering'),
  (6050152, 'Ahmad Susantri', 'Engineering'),
  (6050163, 'Ahmad Zulpadli', 'Engineering'),
  (6050213, 'Bambang Sunoto', 'Engineering'),
  (6050208, 'Catur Podo Anggono F.', 'Engineering'),
  (6050151, 'Diryanto', 'Engineering'),
  (6050154, 'Dwi Atmodjo Setiadi', 'Engineering'),
  (6050631, 'Ilham Muhamad Fais', 'Engineering'),
  (6050484, 'Irwan Rochmayadi', 'Engineering'),
  (6050535, 'Marsono', 'Engineering'),
  (6050246, 'Mohammad Wahyu Isnamunandar', 'Engineering'),
  (6050166, 'Muhamad Cik Dong', 'Engineering'),
  (6050640, 'Muhammad Fatihuddin Nurhidayat', 'Engineering'),
  (6050170, 'Murtadho', 'Engineering'),
  (6050211, 'Nanang Agus Setiawan', 'Engineering'),
  (6050627, 'Nanda Setia Irawan', 'Engineering'),
  (6050232, 'Nico Prasetyo', 'Engineering'),
  (6050617, 'Nova Purna Irawan', 'Engineering'),
  (6050182, 'Nugroho Kris Yulianto', 'Engineering'),
  (6050173, 'Partono', 'Engineering'),
  (6050626, 'Reza Arinda Pradana', 'Engineering'),
  (6050159, 'Richard Gerrits', 'Engineering'),
  (6050511, 'Rifky Khoirulloh Yoga Pratama', 'Engineering'),
  (6050160, 'Susanto', 'Engineering'),
  (6050212, 'Taufiq Hidayat', 'Engineering'),
  (6050624, 'Ujang Kaisar', 'Engineering'),
  (6050636, 'Yohanes Pendi Nuari', 'Engineering'),
  (6050174, 'Yullyarno', 'Engineering'),
  (6050195, 'Abdul Gani', 'Production'),
  (6050637, 'Abi Ubaidilah', 'Production'),
  (6050072, 'Afrial', 'Production'),
  (6050569, 'Agung Nugroho', 'Production'),
  (6050598, 'Agung Wijayanto', 'Production'),
  (6050096, 'Agus Birwana', 'Production'),
  (6050235, 'Agus Suyono', 'Production'),
  (6050250, 'Agustomi', 'Production'),
  (6050079, 'Ahmad', 'Production'),
  (6050646, 'Ahmad Fahriza Arigi', 'Production'),
  (6050190, 'Ahmad Khairindra', 'Production'),
  (6050221, 'Ahmad Rifai', 'Production'),
  (6050595, 'Aji Miftahul Hidayah', 'Production'),
  (6050202, 'Akhmad Apriyanto', 'Production'),
  (6050618, 'Alan Ferdian Nur Alif Aji Bachtiar', 'Production'),
  (6050178, 'Amim Ridho', 'Production'),
  (6050585, 'Andi Prasetyo', 'Production'),
  (6050196, 'Andri Parulian Ompu Sunggu', 'Production'),
  (6050226, 'Angga Rahmat Ramadhany', 'Production'),
  (6050244, 'Anton Listiyanto', 'Production'),
  (6050619, 'Arendra Surya Adeputra', 'Production'),
  (6050572, 'Arif Hidayat', 'Production'),
  (6050243, 'Aris Pargiyanto', 'Production'),
  (6050066, 'Asep Komara', 'Production'),
  (6050144, 'Azhari A Bakar', 'Production'),
  (6050608, 'Bagas Prasetyo', 'Production'),
  (6050528, 'Bagus Biantoro', 'Production'),
  (6050251, 'Bahrul Alam', 'Production'),
  (6050529, 'Bakoh Setiawan', 'Production'),
  (6050209, 'Bayni Khaeroni', 'Production'),
  (6050115, 'Bayu Rachmad Widjaja', 'Production'),
  (6050082, 'Bin Arnawis Med', 'Production'),
  (6050223, 'Dadang Juhaedi', 'Production'),
  (6050582, 'Danang Alfiyono', 'Production'),
  (6050056, 'Darno', 'Production'),
  (6050630, 'David Hendra Saputra', 'Production'),
  (6050057, 'Dede Saepudin', 'Production'),
  (6050604, 'Dedy Pry Anggara', 'Production'),
  (6050065, 'Dedy Yuliawan', 'Production'),
  (6050544, 'Deni Romandhoni', 'Production'),
  (6050515, 'Deni Stepan', 'Production'),
  (6050638, 'Divasco Togap Silaban', 'Production'),
  (6050136, 'Djani Suradi', 'Production'),
  (6050101, 'Dominicus Marsono', 'Production'),
  (6050222, 'Doni Indrayadi', 'Production'),
  (6050093, 'Dwi Agus Prasetio', 'Production'),
  (6050240, 'Dwi Joko Mulyono', 'Production'),
  (6050083, 'Dwi Juli Purnomo', 'Production'),
  (6050107, 'Dwi Pranoto', 'Production'),
  (6050198, 'Eko Haryanto', 'Production'),
  (6050540, 'Eko Suroso', 'Production'),
  (6050125, 'Endang', 'Production'),
  (6050231, 'Erwan Hariyanto', 'Production'),
  (6050592, 'Falah Asfaraini', 'Production'),
  (6050620, 'Faris Hibatullah', 'Production'),
  (6050095, 'Feri Suprianto', 'Production'),
  (6050625, 'Fitdo Zainussyoim', 'Production'),
  (6050628, 'Gilang Ramadhan', 'Production'),
  (6050104, 'Harjon Habeahan', 'Production'),
  (6050201, 'Hartanto Tri Andono', 'Production'),
  (6050126, 'Hartono', 'Production'),
  (6050062, 'Hasanudin', 'Production'),
  (6050581, 'Herlambang Ramawan', 'Production'),
  (6050241, 'Heru Prasetyo', 'Production'),
  (6050164, 'Ibrahim', 'Production'),
  (6050220, 'Ikhsan Darmawan', 'Production'),
  (6050124, 'Indarjo', 'Production'),
  (6050205, 'Ipnu Prayogo', 'Production'),
  (6050643, 'Iqbal Kenafianto', 'Production'),
  (6050621, 'Iqbal Nashrudin', 'Production'),
  (6050236, 'Irawan Firdianto', 'Production'),
  (6050259, 'Irfan Musaddad Ahmad', 'Production'),
  (6050629, 'Irvan Amir Ma''sum', 'Production'),
  (6050105, 'Isak', 'Production'),
  (6050565, 'Itang Ramdani', 'Production'),
  (6050584, 'Jamin', 'Production'),
  (6050568, 'Jefri Fariansyah', 'Production'),
  (6050216, 'Joko Febriyadi', 'Production'),
  (6050150, 'Joni Irawan', 'Production'),
  (6050128, 'Laksono', 'Production'),
  (6050262, 'Laurentius Dimas Gani Samboja', 'Production'),
  (6050059, 'Madyani', 'Production'),
  (6050094, 'Maijoni', 'Production'),
  (6050200, 'Markos', 'Production'),
  (6050149, 'Maryanto', 'Production'),
  (6050118, 'Masrobbi Alfaridi', 'Production'),
  (6050100, 'Mintaria', 'Production'),
  (6050218, 'Muh. Afiffudin', 'Production'),
  (6050541, 'Muhamad Kirdi', 'Production'),
  (6050248, 'Muhamad Sidiq', 'Production'),
  (6050566, 'Muhammad Fadholi Simamora', 'Production'),
  (6050238, 'Muhammad Firdaus', 'Production'),
  (6050516, 'Muhammad Heru Satrio Pradana', 'Production'),
  (6050641, 'Muhammad Ivan Fadillah', 'Production'),
  (6050651, 'Muhammad Rizki', 'Production'),
  (6050647, 'Muhammad Sadam Sholahuddin', 'Production'),
  (6050642, 'Muhammad Syahru Romadon', 'Production'),
  (6050179, 'Mulyadi', 'Production'),
  (6050237, 'Mulyanto', 'Production'),
  (6050074, 'Musliadi', 'Production'),
  (6050123, 'Muslih', 'Production'),
  (6050161, 'Muslim', 'Production'),
  (6050207, 'Narwa', 'Production'),
  (6050601, 'Naufal Rofif', 'Production'),
  (6050603, 'Nugroho Agung Wibowo', 'Production'),
  (6050137, 'Nurcahyo', 'Production'),
  (6050117, 'Nurkhamid', 'Production'),
  (6050652, 'Nuzul Bragas Sabilillah', 'Production'),
  (6050650, 'Pajri Harnedi', 'Production'),
  (6050181, 'Purwanto', 'Production'),
  (6050577, 'Rifqi Nur Aminudin Subroto', 'Production'),
  (6050191, 'Riki Krismanto', 'Production'),
  (6050602, 'Rino Mulyadi Kusuma', 'Production'),
  (6050189, 'Rio Afandy Gunawan', 'Production'),
  (6050578, 'Rio Bayu Alfiandi', 'Production'),
  (6050588, 'Rochim Qolibbi Danu Wantoro', 'Production'),
  (6050586, 'Rosyid Aldi Nugroho', 'Production'),
  (6050219, 'Safarudin', 'Production'),
  (6050197, 'Saiful Amar', 'Production'),
  (6050607, 'Sakin Aripin', 'Production'),
  (6050639, 'Salman Rifqi Alfariz', 'Production'),
  (6050043, 'Samian', 'Production'),
  (6050052, 'Sarjono', 'Production'),
  (6050028, 'Saroni', 'Production'),
  (6050106, 'Satiman', 'Production'),
  (6050206, 'Sepriyadi', 'Production'),
  (6050531, 'Simon Brillian Febrianto', 'Production'),
  (6050138, 'Siti Mutmainah', 'Production'),
  (6050579, 'Sobron Miftahul Latif', 'Production'),
  (6050199, 'Subari', 'Production'),
  (6050067, 'Suharyanto', 'Production'),
  (6050644, 'Sukirman', 'Production'),
  (6050029, 'Supatmah', 'Production'),
  (6050483, 'Sustono', 'Production'),
  (6050156, 'Sutarto', 'Production'),
  (6050073, 'Suyadi', 'Production'),
  (6050085, 'Suyanto', 'Production'),
  (6050583, 'Tegar Pambudi', 'Production'),
  (6050616, 'Tegas Hidayat', 'Production'),
  (6050078, 'Teguh Mujiyono', 'Production'),
  (6050648, 'Tio Diva Ardiansyah', 'Production'),
  (6050135, 'Tri Andayani', 'Production'),
  (6050148, 'Tunadi Irwansyah', 'Production'),
  (6050141, 'Tuti Libriyani', 'Production'),
  (6050108, 'Usman', 'Production'),
  (6050155, 'Uun Lesmana', 'Production'),
  (6050605, 'Viryal Ramadhani', 'Production'),
  (6050054, 'Waluyo', 'Production'),
  (6050242, 'Wartopo', 'Production'),
  (6050175, 'Wasono', 'Production'),
  (6050591, 'Wendi Alief Yulianto', 'Production'),
  (6050203, 'Wijayadi Adi Sutanto', 'Production'),
  (6050183, 'Yan Bhakti', 'Production'),
  (6050169, 'Yogo Prayono', 'Production'),
  (6050632, 'Yohanes Krisna Prayoga', 'Production'),
  (6050132, 'Yuhadi Setiawan', 'Production'),
  (6050214, 'Yuli', 'Production')
on conflict (nik) do nothing;

-- ---------- CONTOH kalau nanti mau nambah manual satu-satu ----------
-- insert into public.karyawan (nik, nama, departemen) values
--   (6050999, 'Nama Karyawan Baru', 'Production')
-- on conflict (nik) do nothing;
