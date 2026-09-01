# Aplikasi Maintenance — Laporan Mesin & Checklist PM

Aplikasi web (HTML/CSS/JS biasa, tanpa framework) untuk operator mencatat
kondisi mesin & mengisi checklist preventive maintenance (PM), dengan alur
**draft → review SPV** sebelum masuk rekap resmi. Supabase (Postgres)
dipakai sebagai database + storage foto.

## Alur kerja singkat

1. **Operator** login (akun sendiri) → isi **Laporan Mesin** dan/atau
   **Checklist PM** → tersimpan sebagai **draft**.
2. **SPV** login → dapat notifikasi (lonceng di topbar) tiap ada draft
   baru → buka halaman **Draft** → **Approve** atau **Reject** (dengan
   alasan).
3. Data yang sudah di-approve/reject tetap tercatat riwayatnya dan
   terlihat statusnya di halaman **Rekap Laporan** & **Rekap Checklist
   PM**, lengkap dengan badge status review dan export Excel.
4. **Superadmin** punya semua hak SPV, ditambah halaman **Kelola User**
   untuk bikin/ubah/nonaktifkan akun operator, SPV, maupun superadmin
   lain.

## Role & Permission Matrix

Mulai migration `sql/19_add_role_permission_matrix.sql`, akses dipecah
per departemen (Utility / Production / Lubrication), sesuai dokumen
"Role and Permissions". Sumber kebenaran tunggal untuk mapping
role → menu ada di `PERMISSIONS` (`js/auth.js`); halaman HTML cukup
ditandai `data-module="<key>"` di `<body>` dan tiap link sidebar,
tidak ada daftar role manual lagi di HTML.

| Menu            | Operator Utility | Operator Production | Operator Lubrication | SPV Utility | SPV Production | SPV Lubrication | HOD Engineering | Superadmin |
|-----------------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Dashboard       |     |     |     | ✓ | ✓ | ✓ | ✓ | ✓ |
| Trend           |     |     |     | ✓ | ✓ | ✓ | ✓ | ✓ |
| Reports         | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Utility         | ✓ |     |     | ✓ |   |   | ✓ | ✓ |
| Production      |     | ✓ |     |   | ✓ |   | ✓ | ✓ |
| Lubrication     |     |     | ✓ |   |   | ✓ | ✓ | ✓ |
| QR Code         |     |     |     | ✓ | ✓ | ✓ | ✓ | ✓ |
| Riwayat Mesin   |     |     |     | ✓ | ✓ | ✓ | ✓ | ✓ |
| Draft           |     |     |     | ✓ | ✓ | ✓ | ✓ | ✓ |
| Kelola User     |     |     |     |   |   |   | ✓ | ✓ |
| Online Sekarang |     |     |     |   |   |   |   | ✓ |
| Export Data     |     |     |     | ✓ | ✓ | ✓ | ✓ | ✓ |
| Bersihkan Data  |     |     |     |   |   |   | ✓ | ✓ |
| Audit Log       |     |     |     |   |   |   |   | ✓ |

Akun lama dengan role generik `operator`/`spv` dinonaktifkan otomatis
oleh migration ini (tidak dihapus, tidak dipindah departemen secara
otomatis karena datanya tidak diketahui) — buat ulang akunnya lewat
**Kelola User** dengan role baru yang sesuai.

## QR Mesin (`qrcode.html`)

Tiap equipment di database otomatis dapat QR code sendiri (di-generate
di browser, tidak perlu disimpan/upload ke mana-mana). Isi QR adalah
link ke `laporan.html?equipment=<id>` — begitu di-scan, form Laporan
Mesin langsung kebuka dengan **area, mesin, dan equipment sudah
terpilih otomatis**, operator tinggal isi status + deskripsi + foto.

- Filter per area atau cari nama mesin/equipment.
- Tombol **Cetak semua** (`window.print()`) — layout otomatis rapi
  buat dicetak/ditempel per mesin (sidebar & filter disembunyikan saat
  print lewat CSS `@media print`).
- Cuma butuh tabel `area`/`mesin`/`equipment` yang sudah ada (tidak ada
  tabel baru) — kalau nanti nambah/pindah mesin, QR baru otomatis
  muncul di halaman ini begitu data equipment-nya ada di database.
- **Batasan saat ini**: link QR ini cuma buat form **Laporan Mesin**.
  Checklist PM (`pm.html`/`checklist.html`) dan Production pakai
  daftar statis per kategori (`checklist-data.js`/`production-data.js`),
  bukan tabel `equipment`, jadi belum bisa di-pra-isi dari QR dengan
  cara yang sama — bisa dikerjakan menyusul kalau dibutuhkan.
- Pakai library [`qrcode`](https://www.npmjs.com/package/qrcode) via
  `esm.sh`, sama seperti `xlsx` yang sudah dipakai di halaman rekap —
  tidak perlu instalasi tambahan.

## Audit Log (`audit-log.html`)

Halaman khusus superadmin buat lihat jejak aktivitas penting di aplikasi
ini — siapa melakukan apa dan kapan:

- **Login/logout**: login berhasil, login gagal (username tidak
  ditemukan, password salah, atau akun nonaktif), dan logout.
- **Kelola User**: tambah akun, ubah data akun, reset password,
  aktifkan/nonaktifkan akun.
- **Draft**: approve dan reject (laporan Mesin, Checklist PM, maupun
  Production) — termasuk alasan reject.
- **Bersihkan Data**: tiap data yang dihapus permanen dicatat satu per
  satu (bukan cuma jumlahnya), lengkap dengan status terakhirnya
  sebelum dihapus.
- Bisa difilter per jenis aksi, jenis data, cari nama/username aktor,
  dan rentang tanggal, plus export ke Excel.
- Baris di tabel `audit_log` **tidak bisa diubah/dihapus lewat
  aplikasi ini** (RLS cuma kasih izin SELECT + INSERT) — dibuat begitu
  supaya riwayatnya tetap bisa dipercaya.

Setiap kali ada aksi yang dicatat, `js/audit.js` mengirim insert ke
tabel `audit_log` secara terpisah dari aksi utamanya — kalau pencatatan
gagal (mis. tabelnya belum dibuat), aksi utama (login, approve, hapus
data, dst) tetap jalan seperti biasa, cuma dicatat error-nya di console.

## Riwayat Mesin (`riwayat-mesin.html`)

Halaman detail per equipment — sebelumnya histori 1 mesin cuma bisa
dilihat dengan cari manual satu-satu di tabel Rekap. Sekarang:

- Pilih area → mesin → equipment (atau buka lewat link
  `riwayat-mesin.html?equipment=<id>`, mis. dari halaman lain nanti).
- Kartu ringkasan: total laporan, jumlah breakdown/maintenance/running,
  dan status laporan terakhir.
- **Timeline** kronologis gabungan Laporan Mesin, Checklist PM, dan
  Checklist Production untuk equipment itu — status/detail masing-masing,
  tanggal, status review (termasuk alasan kalau ditolak), dan thumbnail
  foto (klik buat lihat ukuran penuh).
- Bisa difilter rentang tanggal.
- Tombol "+ Laporan baru mesin ini" langsung ke form Laporan Mesin
  dengan equipment yang sama sudah terisi (pakai mekanisme yang sama
  dengan QR Mesin).
- **Cara nyambungin Checklist PM/Production ke equipment**: field
  `equipment` di kedua tabel itu isian bebas (bukan relasi ke tabel
  `equipment`), jadi dicocokkan otomatis pakai `ILIKE %nama equipment%`
  terhadap nama equipment yang dipilih. Cukup akurat kalau operator
  ngetik equipment sesuai/mirip nama di master data, tapi bisa meleset
  (kelewat atau ketangkep entri yang salah) kalau penulisannya beda
  jauh — ada catatan kecil soal ini di halamannya.
- **Lubrication belum ikut**: modul Lubrication tidak berbasis
  equipment sama sekali (per **Line** produksi, isinya banyak titik
  lubrikasi lintas mesin dalam 1 line), jadi belum ada cara wajar buat
  menyambungkannya ke 1 equipment tertentu di halaman ini.

## Trend & Analytics (`trend.html`)

Halaman khusus SPV & superadmin buat lihat pola, bukan cuma angka hari
ini kayak di Dashboard:

- **Trend status per bulan** — stacked bar Running/Standby/Maintenance/
  Breakdown untuk 3/6/12 bulan terakhir (dari bulan yang dipilih mundur).
- **Distribusi status bulan terpilih** — donut chart.
- **Mesin paling sering breakdown bulan terpilih** — bar chart top 10,
  supaya cepat kelihatan mesin mana yang paling banyak makan waktu.
- **Tabel ranking lengkap** — semua mesin di bulan itu dengan rincian
  jumlah per status, diurutkan dari breakdown terbanyak (juga jadi
  fallback yang bisa dibaca screen reader / tanpa JS chart).
- Bisa difilter per area, dan datanya mengikuti semua laporan (semua
  status review — draft/approved/rejected — sama seperti Dashboard).

Pakai [Chart.js](https://www.chartjs.org/) lewat dynamic `import()` dari
`esm.sh` (bukan `<script>` tag dari `cdnjs` lagi — beberapa jaringan
kantor/firewall memblokir domain `cdnjs.cloudflare.com` sepenuhnya,
sedangkan `esm.sh` sudah pasti kepakai di app ini buat
`@supabase/supabase-js` & `xlsx`, jadi lebih aman dipakai juga buat
Chart.js). Tidak perlu instalasi apa pun. Butuh policy baca tabel `laporan` yang sama
dengan Dashboard/Rekap (`sql/add_rekap_read_policy.sql`).

## Lubrication (`lubrication.html` / `lubrication-checklist.html`)

Modul checklist titik lubrikasi (pelumasan) per line produksi (Line 1-4),
sumbernya file "Fox's Lubrication" per line.

- **Tidak ada pemilihan equipment/periode di awal** — 1 line = 1
  checklist berisi semua titik lubrikasi line itu sekaligus (tiap titik
  sudah punya frekuensi, jenis pelumas, status mesin saat dilumasi
  (Stop/Running), metode aplikasi, dan estimasi jumlah pemakaiannya
  masing-masing dari data sumber).
- **Alurnya SAMA PERSIS dengan Production** (dan Checklist PM): operator
  pilih line di `lubrication.html` → isi status tiap titik (Sudah/Belum),
  qty terpakai, keterangan, dan foto evidence kalau perlu di
  `lubrication-checklist.html` → submit tersimpan sebagai **draft** →
  SPV/superadmin dapat notifikasi lonceng & approve/reject di
  `draft.html` → baru muncul di tab "Rekap Lubrication" dengan status
  reviewnya, siap di-export.
- Titik yang ditandai `CRITICAL POINT` di data sumber (wajib dicek tiap
  shift, misal Top/Bottom Cooker Rotor) ditandai badge merah di form
  maupun rekap/draft, dan tab "Rekap Lubrication" (SPV & superadmin)
  menampilkan kolom "Titik Critical Belum Dilakukan" per submission
  supaya cepat kelihatan kalau ada titik critical yang kelewat.
- Tab **Rekap Lubrication** (khusus SPV & superadmin, sama pola dengan
  tab rekap di `production.html`) — filter tanggal & line, badge status
  review, lihat detail per submission, dan export ke Excel.
- Cara nambah/ubah data titik lubrikasi: edit langsung
  `js/lubrication-data.js` (formatnya sudah didokumentasikan di komentar
  paling atas file itu).

## Ganti Bahasa ID/EN

Ada tombol **ID | EN** di pojok kanan topbar tiap halaman (termasuk halaman
login) buat ganti tampilan antara Bahasa Indonesia dan Inggris.

- Cara kerjanya: `js/i18n.js` punya satu kamus teks Indonesia asli → Inggris
  (`DICT`), lalu jalan-jalan (walk) ke semua teks & atribut
  (`placeholder`/`title`/`aria-label`) di halaman dan menggantinya kalau
  cocok persis dengan salah satu entri kamus. Teks Indonesia aslinya
  disimpan di memori (bukan ditimpa permanen), jadi tinggal toggle balik
  buat kembali ke Bahasa Indonesia tanpa kamus kebalikan terpisah.
- Konten yang di-generate belakangan oleh JS (tabel rekap, badge status,
  pesan error, dsb) ikut otomatis diterjemahkan lewat `MutationObserver` —
  jadi **tidak perlu** ubah `app.js`/`rekap.js`/dll satu-satu.
- Pilihan bahasa disimpan di `localStorage` (per browser/device, bukan per
  akun), jadi tetap kepilih walau reload atau pindah halaman.
- **Cakupan**: navigasi, tombol, label form, status, badge, pesan
  error/sukses, dan hampir semua teks UI di semua halaman. Isi "Uraian
  pekerjaan" pada Checklist PM & Production (ratusan baris di
  `js/checklist-data.js`/`js/production-data.js`, daftar tugas maintenance
  teknis yang sumbernya sudah campur ID/EN) **sengaja tidak** ikut
  diterjemahkan — kalau suatu saat mau ditambah, tinggal tambah pasangan
  `"teks Indonesia": "English text"` baru di `DICT` pada `js/i18n.js`, tidak
  perlu ubah kode lain. Export ke Excel juga tetap berisi teks Indonesia
  apa adanya (dibuat terpisah dari tampilan halaman).

## PWA (bisa di-install ke HP)

App ini sudah bisa di-"Add to Home Screen" / install seperti aplikasi
biasa (Android Chrome & iOS Safari), lewat `manifest.webmanifest` +
`sw.js` (service worker).

- Yang di-cache: tampilan app (HTML/CSS/JS/logo/icon) — jadi app kebuka
  cepat dan tetap kebuka meski sinyal lemot/putus sebentar.
- Yang **TIDAK** offline: data (laporan, checklist, rekap, login) tetap
  butuh internet karena disimpan di Supabase. Kalau koneksi mati pas
  buka halaman baru, muncul halaman "Koneksi terputus" (`offline.html`)
  alih-alih layar putih.
- File terkait: `manifest.webmanifest`, `sw.js`, `offline.html`,
  `js/pwa.js` (daftarin service worker), `assets/icon-192.png`,
  `assets/icon-512.png`, `assets/icon-maskable-512.png`.
- Kalau ganti isi CSS/JS dan mau user langsung dapat versi baru, naikkan
  `CACHE_VERSION` di `sw.js` (mis. `skr-mtc-v2`) — kalau tidak, browser
  bisa masih pakai app-shell versi lama dari cache untuk sementara
  (biasanya update sendiri di kunjungan berikutnya).

## Isi folder

```
login.html                     login pakai username & password
index.html                     dashboard ringkasan (SPV & superadmin)
trend.html                     trend & analytics: status per bulan, mesin paling sering
                                breakdown, ranking lengkap (SPV & superadmin)
qrcode.html                     generate & cetak QR code per equipment — scan buka form
                                Laporan Mesin dengan equipment sudah terisi otomatis
                                (SPV & superadmin)
riwayat-mesin.html              histori laporan 1 equipment dalam satu timeline (bukan
                                tersebar di tabel rekap) — total, breakdown, foto, dst
                                (SPV & superadmin)
laporan.html                   form Laporan Mesin (semua role)
rekap.html                     rekap laporan + export Excel (SPV & superadmin)
pm.html                        pilih equipment & periode checklist PM (semua role)
checklist.html                 form isian checklist PM (semua role)
rekap-pm.html                  rekap checklist PM + detail + export Excel (SPV & superadmin)
production.html                pilih equipment & periode form Production (semua role)
production-checklist.html      form isian checklist Production (semua role)
rekap-production.html          rekap Production + detail + export Excel (SPV & superadmin)
lubrication.html               pilih line & rekap Lubrication (isi: semua role · rekap: SPV & superadmin)
lubrication-checklist.html     form isian checklist Lubrication per line (semua role) — draft, alurnya sama
                                seperti Production
draft.html                     tinjau & approve/reject draft (SPV & superadmin) — laporan, Checklist PM,
                                Production, & Lubrication
kelola-user.html               kelola akun: tambah/edit/reset password/nonaktifkan (khusus superadmin)
bersihkan-data.html            hapus permanen laporan/checklist lama yang approved/rejected, sekalian foto di storage (khusus superadmin)
audit-log.html                 jejak aktivitas: login/logout, kelola user, approve/reject, hapus data (khusus superadmin)

css/
  style.css                    tampilan semua halaman

js/
  config.js                    isi URL & anon key project Supabase kamu di sini
  i18n.js                      ganti bahasa ID/EN (kamus + auto-translate DOM,
                                dipakai di semua halaman lewat tombol topbar)
  auth.js                      sesi login, hash password, penjaga akses halaman,
                                sidebar/topbar sesuai peran, lonceng notifikasi
  login.js                     logic halaman login (cek akun ke database)
  kelola-user.js                logic halaman Kelola User (khusus superadmin)
  bersihkan-data.js            logic halaman Bersihkan Data (khusus superadmin)
  audit.js                      modul kecil buat mencatat aktivitas penting ke tabel audit_log
                                (dipakai bareng oleh auth.js/kelola-user.js/draft.js/bersihkan-data.js)
  audit-log.js                  logic halaman Audit Log: filter, tabel, export Excel (khusus superadmin)
  image-compress.js            kompres foto (resize + re-encode JPEG) di browser sebelum upload,
                                dipakai bareng oleh app.js/checklist.js/production-checklist.js
  app.js                       logic form Laporan Mesin + koneksi Supabase
  checklist.js                 logic form Checklist PM
  checklist-data.js            daftar checklist per equipment/periode (data statis)
  pm.js                        logic halaman pilih checklist PM
  production-checklist.js      logic form Production (sama pola dengan checklist.js)
  production-data.js           daftar checklist Production per equipment/periode (data statis,
                                sumbernya file Excel "Maintenance Task List" per line — sudah ada
                                Extrusion & Gummy Candy, line lain menyusul)
  production.js                logic halaman pilih checklist Production
  rekap-production.js          rekap Production: filter, tabel, badge review, export Excel
  lubrication.js               logic pilih line Lubrication (kartu Line 1-4)
  lubrication-tabs.js          switch tab "Isi Lubrication" / "Rekap Lubrication" di lubrication.html
  lubrication-checklist.js     logic form Lubrication per line — submit = draft, kirim notifikasi SPV
                                (sama pola dengan production-checklist.js)
  lubrication-data.js          daftar titik lubrikasi per line (data statis, sumbernya file
                                "Fox's Lubrication" per line — Line 1-4)
  rekap-lubrication.js         rekap Lubrication: filter, tabel, detail, hitung titik critical yang
                                belum dilakukan, export Excel
  rekap.js                     rekap laporan: filter, tabel, badge review, export Excel
  rekap-pm.js                  rekap checklist PM: filter, detail, badge review, export Excel
  draft.js                     logic halaman Draft: tab status, approve/reject
  notify.js                    kirim notifikasi ke SPV tiap ada laporan/checklist baru
  dashboard.js                 logic dashboard ringkasan
  trend.js                     logic halaman Trend & Analytics (agregasi laporan jadi chart,
                                pakai Chart.js via dynamic import dari esm.sh)
  qrcode-page.js                logic halaman QR Mesin (generate QR per equipment pakai
                                library "qrcode" via esm.sh, filter, cetak)
  riwayat-mesin.js              logic halaman Riwayat Mesin (pilih equipment, tampilkan
                                statistik & timeline semua laporannya)
  sidebar.js                   buka/tutup sidebar (semua halaman)

assets/
  logo.png                     logo di header

sql/                           jalankan urut sesuai nomor di bagian setup di bawah
  schema.sql
  seed_master_data.sql
  add_rekap_read_policy.sql
  add_multi_foto.sql
  add_pm_checklist.sql
  add_draft_workflow.sql
  add_user_accounts.sql
  add_pm_checklist_foto.sql
  add_production_checklist.sql
  add_delete_policy.sql
  add_audit_log.sql
  add_lubrication_checklist.sql
  add_lubrication_draft_workflow.sql

data/
  master_data.json             data mentah hasil olahan Excel (referensi/backup)
```

## Langkah setup

### 1. Buat project Supabase
Buka [supabase.com](https://supabase.com) → New Project. Tunggu sampai
project selesai dibuat.

### 2. Jalankan SQL, urut sesuai nomor
Buka **SQL Editor** di dashboard Supabase → New query → paste isi file →
Run. Jalankan **berurutan**, karena file belakangan butuh tabel/kolom
dari file sebelumnya:

1. `sql/schema.sql` — bikin tabel `area`/`mesin`/`equipment` (master data
   berjenjang), tabel `laporan`, RLS dasar (siapa saja boleh baca master
   data & insert laporan, tidak bisa ubah/hapus dari browser), dan
   storage bucket `foto-laporan` (public) untuk foto upload.
2. `sql/seed_master_data.sql` — isi 8 area, 73 mesin, ±586 equipment
   sesuai file Excel. Kalau data mesin di Excel berubah nanti, generate
   ulang file ini dari Excel versi baru.
3. `sql/add_rekap_read_policy.sql` — izin baca (read-only) ke tabel
   `laporan`, dibutuhkan supaya halaman rekap & draft bisa menampilkan
   data.
4. `sql/add_multi_foto.sql` — tabel `laporan_foto`, supaya 1 laporan
   Mesin bisa punya beberapa foto (dari kamera maupun galeri).
5. `sql/add_pm_checklist.sql` — tabel `pm_checklist_submission`, tempat
   hasil isian Checklist PM tersimpan.
6. `sql/add_draft_workflow.sql` — menambahkan alur draft & review:
   kolom `review_status` (`draft`/`approved`/`rejected`),
   `reviewed_by`, `reviewed_at`, `reject_reason` di tabel `laporan` &
   `pm_checklist_submission`; izin update dari browser (supaya SPV bisa
   approve/reject); dan tabel `notifikasi` untuk lonceng notifikasi SPV.
7. `sql/add_user_accounts.sql` — tabel `app_user` (akun per orang:
   username, password ter-hash, nama, role, aktif/tidak), plus 1 akun
   superadmin awal (`admin` / `admin123` — **ganti lewat halaman Kelola
   User begitu bisa login**).
8. `sql/add_pm_checklist_foto.sql` — tabel `pm_checklist_foto`, supaya 1
   Checklist PM bisa punya beberapa foto evidence (dari kamera maupun
   galeri, sama seperti `laporan_foto`); dan storage bucket
   `foto-checklist-pm` (public) untuk foto upload-nya.
9. `sql/add_production_checklist.sql` — modul baru **Production**
   (`production.html` / `production-checklist.html`): tabel
   `production_checklist_submission` + `production_checklist_foto`,
   storage bucket `foto-production-checklist`, dan izin tipe
   `production_checklist` di tabel `notifikasi`. Alurnya sama persis
   dengan Checklist PM (draft → review SPV → rekap). Datanya ada di
   `js/production-data.js`.
10. `sql/add_delete_policy.sql` — izin hapus (delete) dari browser untuk
    tabel `laporan`, `laporan_foto`, `pm_checklist_submission`,
    `pm_checklist_foto`, `production_checklist_submission`, dan
    `production_checklist_foto`. Dibutuhkan supaya halaman **Bersihkan
    Data** (superadmin) bisa menghapus permanen data lama.
11. `sql/add_audit_log.sql` — tabel `audit_log`, tempat tercatatnya
    aktivitas penting (login/logout, kelola user, approve/reject, hapus
    data). Dibutuhkan supaya halaman **Audit Log** (superadmin) bisa
    menampilkan datanya.
12. `sql/add_lubrication_checklist.sql` — modul baru **Lubrication**
    (`lubrication.html` / `lubrication-checklist.html`): tabel
    `lubrication_checklist_submission` + `lubrication_checklist_foto`,
    storage bucket `foto-lubrication-checklist`. Datanya ada di
    `js/lubrication-data.js` (Line 1-4).
13. `sql/add_lubrication_draft_workflow.sql` — menyusulkan Lubrication
    ikut alur draft/review yang sama seperti Production: menambah kolom
    `review_status`/`reviewed_by`/`reviewed_at`/`reject_reason` di
    `lubrication_checklist_submission`, izin update dari browser (supaya
    SPV bisa approve/reject), dan tipe `lubrication_checklist` di tabel
    `notifikasi`. **Jalankan file ini** supaya submission Lubrication
    baru muncul di halaman Draft dan bisa direview sebelum masuk rekap.

### 3. Ambil API key
**Project Settings → API**. Salin:
- **Project URL**
- **anon public key**

Paste ke `js/config.js`:

```js
export const SUPABASE_URL = "https://xxxxx.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOi...";
```

Password akun **tidak** lagi diatur di file ini — akun dibuat lewat
halaman **Kelola User** setelah login sebagai superadmin (lihat langkah
5 di bawah).

### 4. Jalankan/deploy

Karena file JS pakai ES module (`import`), file harus dibuka lewat web
server, bukan langsung double-click `login.html` (browser akan blokir
karena aturan CORS untuk `file://`).

**Coba lokal dulu** (dari folder project):
```bash
python3 -m http.server 8000
```
lalu buka `http://localhost:8000/login.html`.

**Deploy publik** (gratis, tinggal drag & drop folder ini):
- [Netlify Drop](https://app.netlify.com/drop)
- [Vercel](https://vercel.com) (import folder / hubungkan ke repo)
- Cloudflare Pages
- Atau GitHub Pages kalau foldernya di-push ke repo GitHub

Setelah deploy, link `login.html`-nya bisa langsung dibuka dari HP
operator di lantai produksi maupun laptop SPV — semua halaman responsif
untuk layar kecil.

### 5. Login pertama & buat akun asli

1. Buka `login.html`, masuk pakai akun default: username `admin`,
   password `admin123`.
2. Buka menu **Kelola User** di sidebar.
3. Reset password akun `admin` ke password baru yang cuma kamu tahu
   (tombol "Reset password").
4. Tambah akun asli untuk tiap operator/SPV yang perlu pakai app ini
   (username, nama, role, password awal — sebaiknya minta mereka ganti
   sendiri lewat superadmin kalau mau ganti password nanti, karena app
   ini belum ada fitur "ganti password sendiri" dari sisi user biasa).

## Peran & akses halaman

| Halaman | Operator | SPV | Superadmin |
|---|---|---|---|
| Login | ✅ | ✅ | ✅ |
| Input laporan (`laporan.html`) | ✅ | ✅ | ✅ |
| Checklist PM (`pm.html`, `checklist.html`) | ✅ | ✅ | ✅ |
| Dashboard (`index.html`) | – | ✅ | ✅ |
| Rekap laporan (`rekap.html`) | – | ✅ | ✅ |
| Rekap Checklist PM (`rekap-pm.html`) | – | ✅ | ✅ |
| Lubrication — isi checklist (`lubrication.html`, `lubrication-checklist.html`) | ✅ | ✅ | ✅ |
| Lubrication — tab Rekap (di `lubrication.html`) | – | ✅ | ✅ |
| Draft — review & approve/reject (`draft.html`) — laporan, Checklist PM, Production, Lubrication | – | ✅ | ✅ |
| Kelola User (`kelola-user.html`) | – | – | ✅ |
| Bersihkan Data (`bersihkan-data.html`) | – | – | ✅ |
| Audit Log (`audit-log.html`) | – | – | ✅ |

Setelah login, sidebar otomatis cuma menampilkan menu yang jadi hak
peran itu (diatur `js/auth.js`, lewat atribut `data-allow` di tiap
`<body>` halaman dan `data-role` di tiap link sidebar). Kalau operator
mencoba buka URL rekap/draft/kelola-user langsung, otomatis dilempar
balik ke halaman defaultnya. Sesi login disimpan di `sessionStorage`,
jadi hilang otomatis kalau tab/browser ditutup — tinggal masuk lagi
lewat `login.html`.

## Cara kerja singkat

- **Login**: `login.js` mengirim username + password ke `loginWithUsername()`
  di `auth.js`, yang mencocokkan hash SHA-256 password dengan
  `password_hash` di tabel `app_user`. Kalau cocok dan akun aktif, data
  akun (id, username, nama, role) disimpan di sesi browser
  (`sessionStorage`).
- Saat halaman form dibuka, `app.js`/`checklist.js` mengambil data
  master (`area`/`mesin`/`equipment`, atau daftar checklist) sekali di
  awal, lalu dropdown difilter di sisi browser.
- Saat submit laporan atau checklist PM: data disimpan dengan
  `review_status = 'draft'` (default di database), lalu `notify.js`
  membuat 1 baris di tabel `notifikasi` supaya muncul di lonceng SPV.
  Untuk laporan Mesin, foto (kamera dan/atau galeri, bisa lebih dari
  satu) **dikompres dulu di browser** (`image-compress.js`: resize ke
  maks 1600px sisi terpanjang + re-encode ke JPEG quality 0.75, dengan
  fallback ke file asli kalau proses gagal atau hasil kompresnya malah
  lebih besar) sebelum diupload ke storage bucket `foto-laporan`, URL
  publiknya disimpan di tabel `laporan_foto`. Checklist PM & Production
  pakai pola kompres yang sama.
- SPV/superadmin membuka `draft.html`, melihat semua draft (tab
  Menunggu review/Disetujui/Ditolak/Semua), lalu **Approve** (langsung)
  atau **Reject** (wajib isi alasan). Ini meng-update `review_status`,
  `reviewed_by` (nama akun yang login), `reviewed_at`, dan
  `reject_reason`. Membuka halaman Draft juga otomatis menandai semua
  notifikasi yang ada sebagai sudah dibaca.
- Halaman Rekap (laporan & checklist PM) menampilkan badge status review
  di tiap baris/kartu, dan ikut disertakan di export Excel.
- Dashboard (SPV & superadmin) menampilkan ringkasan hari ini plus kartu
  "Draft menunggu review" yang langsung mengarah ke halaman Draft.
- **Kelola User** (superadmin): tambah akun baru (password di-hash SHA-256
  sebelum dikirim ke database), edit data akun, reset password lewat
  modal terpisah, dan aktifkan/nonaktifkan akun. Akun tidak pernah
  dihapus permanen dari sini — cuma dinonaktifkan — supaya riwayat
  "direview/diinput oleh siapa" di data lama tetap utuh. Superadmin
  tidak bisa menonaktifkan akun yang sedang dipakainya sendiri, atau
  mengubah role akun sendiri jadi bukan superadmin, supaya tidak
  kekunci dari halaman ini.
- **Bersihkan Data** (superadmin): buat menghapus permanen laporan/PM
  checklist/production checklist lama yang sudah **Approved** atau
  **Rejected** (draft sengaja tidak bisa dihapus dari sini, karena masih
  perlu direview). Superadmin memilih jenis data, status, dan tanggal
  batas "direview sebelum", lalu pilih baris mana saja yang mau dihapus.
  Saat konfirmasi, urutannya: foto-foto terkait dihapus dulu dari storage
  bucket (`foto-laporan`/`foto-checklist-pm`/`foto-production-checklist`),
  baru row-nya di database (row di tabel foto ikut terhapus otomatis
  lewat `on delete cascade`) — supaya tidak ada file foto yang jadi
  sampah tanpa row database yang menunjuknya.
- **Audit Log** (superadmin): tiap kali ada aksi penting — login/logout,
  tambah/ubah/reset password/aktifkan/nonaktifkan user, approve/reject
  draft, atau hapus data permanen — `js/audit.js` mengirim 1 baris ke
  tabel `audit_log` berisi siapa (username, nama, role), aksi apa, data
  apa yang kena, dan kapan. Halaman Audit Log menampilkan ini sebagai
  tabel yang bisa difilter (jenis aksi, jenis data, aktor, rentang
  tanggal) dan diexport ke Excel. Pencatatan ini dibuat "best effort" —
  kalau gagal tercatat (mis. koneksi putus), aksi utamanya tetap jalan,
  cuma errornya muncul di console browser, bukan mengganggu pengguna.

## Catatan keamanan

App ini **belum** pakai Supabase Auth beneran (akun + sesi yang
diverifikasi di sisi server) — login cuma mencocokkan hash password ke
tabel `app_user` dari browser, dan pembatasan akses halaman ditegakkan
di sisi tampilan (role gate di `js/auth.js`), bukan di database. Artinya:

- Siapa pun yang punya Project URL + anon key kamu tetap bisa
  query/insert/update tabel `app_user` (dan tabel lain) langsung lewat
  API Supabase, di luar aplikasi ini.
- Password disimpan sebagai hash SHA-256, bukan plain text — jauh
  lebih baik dari versi sebelumnya (password bareng di kode), tapi
  SHA-256 polos juga bukan standar penyimpanan password yang paling
  kuat (idealnya pakai bcrypt/argon2 dengan salt, yang butuh proses di
  server, bukan di browser).
- Belum ada validasi "minimal 1 superadmin aktif" di level database.
- Halaman **Bersihkan Data** menghapus **permanen** (tidak ada
  recycle bin/undo) — pastikan hanya superadmin yang dipercaya yang
  pegang akunnya, dan sebaiknya backup/export dulu data yang mau
  dihapus kalau masih ragu.
- **Audit Log** tidak bisa diubah/dihapus lewat aplikasi ini (RLS-nya
  cuma SELECT + INSERT), tapi karena app masih pakai anon key tanpa
  Supabase Auth (lihat poin pertama), orang yang pegang Project URL +
  anon key tetap bisa insert baris palsu langsung lewat API di luar
  aplikasi ini. Jadi audit log ini berguna buat melacak pemakaian
  normal lewat app, tapi bukan bukti forensik yang tamper-proof.

Kalau nanti butuh proteksi yang lebih kuat (akun beneran lewat Supabase
Auth + RLS berbasis user, hashing password yang lebih kuat di server),
tinggal bilang — bisa dibantu migrasi.
