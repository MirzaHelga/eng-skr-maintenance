// ============================================================================
// i18n.js — Ganti bahasa ID / EN (Indonesia / English)
// ----------------------------------------------------------------------------
// Aplikasi ini teksnya ditulis langsung di HTML & JS (bukan lewat sistem key
// terpisah), jadi pendekatan yang dipakai di sini beda dari i18n biasa:
//
// 1. DICT di bawah adalah kamus "teks Indonesia asli" -> "teks Inggris".
//    Semua HALAMAN & TOMBOL & LABEL & PESAN yang tertulis di kamus ini bisa
//    diterjemahkan bolak-balik ID<->EN secara otomatis, TANPA perlu mengubah
//    isi file HTML/JS lain sama sekali.
// 2. translateNode() jalan-jalan (walk) ke semua text node & atribut
//    (placeholder/title/aria-label) dalam <body>, cari yang cocok persis
//    dengan salah satu key di DICT (atau salah satu PATTERNS untuk teks yang
//    ada angkanya, mis. "12 data ditemukan"), lalu ganti isinya.
// 3. Karena banyak konten di-generate belakangan oleh JS (tabel rekap, dsb),
//    dipasang MutationObserver yang otomatis menerjemahkan ulang setiap ada
//    elemen baru ditambahkan ke halaman — jadi tidak perlu ubah app.js,
//    rekap.js, dst satu-satu.
// 4. Teks ASLI (Indonesia) tiap node disimpan di WeakMap (bukan ditimpa),
//    supaya toggle EN -> ID bisa balik ke teks asli persis, tanpa perlu
//    kamus kebalikannya (EN->ID) yang rawan tabrakan (dua frasa ID beda yang
//    kebetulan diterjemahkan jadi frasa EN yang sama).
//
// CATATAN CAKUPAN:
// - Navigasi, tombol, label form, status, badge, pesan error/sukses, dan
//   hampir semua teks UI di semua 20 halaman -> ikut diterjemahkan.
// - Isi "Uraian pekerjaan" pada Checklist PM & Production (ratusan baris di
//   js/checklist-data.js & js/production-data.js) SENGAJA TIDAK
//   diterjemahkan di sini — itu daftar tugas maintenance yang sangat teknis
//   & sebagian sudah campur Inggris di sumber aslinya. Kalau suatu saat mau
//   ditambah, tinggal tambah pasangan ID->EN baru di DICT di bawah, sistem
//   ini otomatis pakai tanpa perlu ubah kode lain.
// - Export ke Excel (xlsx) tetap berisi teks Indonesia apa adanya (isi file
//   Excel di-generate terpisah dari DOM, di luar jangkauan translator ini).
// ============================================================================

(function () {
  "use strict";

  const LANG_KEY = "skr-lang";

  // -------------------- KAMUS ID -> EN --------------------
  const DICT = {
    // ---- Umum / navigasi / sidebar ----
    "Dashboard": "Dashboard",
    "Trend": "Trend",
    "Trend & Analytics": "Trend & Analytics",
    "Report": "Report",
    "Utility": "Utility",
    "Production": "Production",
    "Lubrication": "Lubrication",
    "QR Mesin": "Machine QR",
    "Riwayat Mesin": "Machine History",
    "Draft": "Draft",
    "Kelola User": "Manage Users",
    "Online Sekarang": "Online Now",
    "Export Data": "Export Data",
    "Bersihkan Data": "Clean Up Data",
    "Audit Log": "Audit Log",
    "Maintenance app": "Maintenance app",
    "Maintenance App": "Maintenance App",
    "Savoria": "Savoria",
    "Keluar": "Log out",
    "Logout": "Log out",
    "Buka menu": "Open menu",
    "Tutup": "Close",

    // ---- Login ----
    "Masuk": "Log in",
    "Masuk sesuai peran kamu": "Log in according to your role",
    "Masuk pakai akun kamu.": "Log in with your account.",
    "Masuk — Maintenance App": "Log in — Maintenance App",
    "Username": "Username",
    "Password": "Password",
    "Username tidak ditemukan": "Username not found",
    "Username tidak ditemukan.": "Username not found.",
    "Password salah": "Wrong password",
    "Password salah.": "Wrong password.",
    "Akun dinonaktifkan": "Account disabled",
    "Akun ini sudah dinonaktifkan. Hubungi Atasan anda.": "This account has been disabled. Contact your supervisor.",
    "Gagal masuk.": "Failed to log in.",
    "Gagal menghubungi server. Coba lagi.": "Failed to reach the server. Try again.",
    "Username wajib diisi.": "Username is required.",
    "Login berhasil": "Login successful",
    "Login gagal": "Login failed",

    // ---- Dashboard ----
    "Dashboard Maintenance": "Maintenance Dashboard",
    "Ringkasan hari ini": "Today's summary",
    "Ringkasan kondisi mesin hari ini": "Today's machine condition summary",
    "Input laporan": "Add report",
    "Lihat rekap": "View recap",
    "Laporan hari ini": "Reports today",
    "Breakdown": "Breakdown",
    "Maintenance": "Maintenance",
    "Running": "Running",
    "Standby": "Standby",
    "Draft menunggu review": "Drafts awaiting review",
    "Laporan terbaru": "Recent reports",
    "Memuat data…": "Loading data…",
    "Distribusi status": "Status distribution",
    "Butuh bantuan?": "Need help?",
    "Isi laporan segera setelah cek kondisi mesin supaya rekap tetap akurat.": "Submit a report right after checking the machine so the recap stays accurate.",
    "Buat laporan baru": "Create new report",
    "Belum ada laporan.": "No reports yet.",
    "Gagal memuat laporan terbaru.": "Failed to load recent reports.",

    // ---- Laporan Mesin ----
    "Laporan Mesin": "Machine Report",
    "Laporan": "Report",
    "Report — Laporan Mesin": "Report — Machine Report",
    "Laporan kondisi & kejadian mesin harian": "Daily machine condition & incident report",
    "Area": "Area",
    "Mesin": "Machine",
    "Equipment": "Equipment",
    "Status mesin": "Machine status",
    "Pilih salah satu status.": "Choose one status.",
    "Tanggal": "Date",
    "Tanggal kejadian (tanggal laporan / inspeksi)": "Incident date (report / inspection date)",
    "Jam Mulai": "Start time",
    "Jam Selesai": "End time",
    "Jam Selesai (tidak boleh sebelum Jam Mulai)": "End time (must not be before start time)",
    "Jam selesai tidak boleh sebelum jam mulai.": "End time must not be before start time.",
    "Shift": "Shift",
    "Shift 1": "Shift 1",
    "Shift 2": "Shift 2",
    "Shift 3": "Shift 3",
    "Pilih shift": "Choose shift",
    "Deskripsi": "Description",
    "Deskripsi kejadian": "Incident description",
    "Jelaskan kondisi atau kejadian pada mesin…": "Describe the machine's condition or incident…",
    "PIC": "PIC",
    "Ambil foto": "Take photo",
    "Upload foto": "Upload photo",
    "Foto evidence": "Evidence photo",
    "Preview foto": "Photo preview",
    "Hapus foto": "Remove photo",
    "Kirim laporan": "Submit report",
    "Laporan terkirim": "Report submitted",
    "Laporan tersimpan sebagai": "Report saved as",
    "Tersimpan sebagai": "Saved as",
    "draft": "draft",
    "dan menunggu review SPV.": "and awaiting SPV review.",
    ", menunggu review SPV.": ", awaiting SPV review.",
    "Pilih area": "Choose area",
    "Pilih area dulu": "Choose an area first",
    "Pilih mesin": "Choose machine",
    "Pilih mesin dulu": "Choose a machine first",
    "Pilih equipment": "Choose equipment",
    "Cari mesin / equipment": "Search machine / equipment",
    "Ketik nama mesin atau equipment…": "Type machine or equipment name…",
    "Equipment dari QR ini tidak ditemukan (mungkin sudah dihapus/diganti). Silakan pilih manual.": "The equipment from this QR was not found (it may have been removed/changed). Please choose manually.",
    "Gagal memuat data area/mesin/equipment. Cek koneksi atau konfigurasi Supabase.": "Failed to load area/machine/equipment data. Check your connection or Supabase configuration.",
    "Gagal mengirim laporan. Coba lagi. (": "Failed to submit report. Try again. (",
    "+ Laporan baru mesin ini": "+ New report for this machine",

    // ---- Rekap Laporan ----
    "Rekap Laporan": "Report Recap",
    "Rekap laporan": "Report recap",
    "Semua status": "All statuses",
    "Semua area": "All areas",
    "Dari tanggal": "From date",
    "Sampai tanggal": "To date",
    "Terapkan filter": "Apply filter",
    "Reset": "Reset",
    "Export Excel": "Export to Excel",
    "Export ke Excel": "Export to Excel",
    "Detail": "Detail",
    "Tidak ada laporan untuk filter ini.": "No reports for this filter.",
    "Gagal memuat data.": "Failed to load data.",
    "Gagal memuat data rekap. Pastikan policy baca tabel laporan sudah dijalankan (lihat add_rekap_read_policy.sql). (": "Failed to load recap data. Make sure the read policy for the report table has been applied (see add_rekap_read_policy.sql). (",

    // ---- Checklist PM ----
    "Checklist PM": "PM Checklist",
    "Checklist PM Utility": "Utility PM Checklist",
    "Checklist PM Production": "Production PM Checklist",
    "Checklist PM Utility & rekapnya": "Utility PM Checklist & its recap",
    "PM Checklist": "PM Checklist",
    "Utility — Checklist PM": "Utility — PM Checklist",
    "Checklist": "Checklist",
    "Isi checklist baru": "Fill in new checklist",
    "Periode": "Period",
    "Semua periode": "All periods",
    "Semua checklist": "All checklists",
    "Bulan / Tahun": "Month / Year",
    "Bulan/Tahun": "Month/Year",
    "cth. Juli 2026": "e.g. July 2026",
    "cth. 2026": "e.g. 2026",
    "Tanggal Inspeksi": "Inspection Date",
    "Checked By (Operator)": "Checked By (Operator)",
    "Diperiksa (OPR)": "Checked (OPR)",
    "Diperiksa (SPV)": "Checked (SPV)",
    "Diperiksa OPR": "Checked OPR",
    "Diperiksa SPV": "Checked SPV",
    "Catatan": "Notes",
    "Catatan tambahan (opsional)": "Additional notes (optional)",
    "Uraian pekerjaan": "Task description",
    "Uraian pekerjaan (per bulan)": "Task description (monthly)",
    "Uraian pekerjaan (per hari)": "Task description (daily)",
    "Geser ke kanan untuk isi semua kolom": "Scroll right to fill in all columns",
    "Simpan checklist": "Save checklist",
    "Checklist tersimpan": "Checklist saved",
    "Checklist tidak ditemukan. Kembali ke daftar checklist dan pilih lagi.": "Checklist not found. Go back to the checklist list and pick again.",
    "Kembali ke daftar checklist": "Back to checklist list",
    "Kembali ke daftar checklist Production": "Back to Production checklist list",
    "Isian Checklist": "Checklist entries",
    "Foto evidence checklist": "Checklist evidence photo",
    "Pilih dulu Checked By (Operator)-nya.": "Choose the Checked By (Operator) first.",
    "Isi dulu Equipment-nya.": "Fill in the Equipment first.",
    "Lengkapi dulu field berikut:": "Please complete the following field(s) first:",
    "Gagal menyimpan checklist. Coba lagi. (": "Failed to save checklist. Try again. (",
    "Gagal memuat daftar mesin.": "Failed to load the machine list.",
    "Equipment tidak ditemukan.": "Equipment not found.",

    // ---- Rekap Checklist PM ----
    "Rekap Checklist PM Utility": "Utility PM Checklist Recap",
    "Rekap\n// Checklist PM Utility": "Recap\n// Utility PM Checklist",
    "Checklist tidak ditemukan untuk filter ini.": "No checklist found for this filter.",
    "Tidak ada checklist untuk filter ini.": "No checklist for this filter.",
    "Gagal memuat data rekap. Pastikan sql/add_pm_checklist.sql sudah dijalankan di Supabase. (": "Failed to load recap data. Make sure sql/add_pm_checklist.sql has been run on Supabase. (",

    // ---- Production ----
    "Checklist Production": "Production Checklist",
    "Rekap Checklist PM Production": "Production PM Checklist Recap",
    "Rekap\n// Checklist PM Production": "Recap\n// Production PM Checklist",
    "Pilih line produksi": "Choose production line",
    "Pilih line produksi ": "Choose production line",
    "Line produksi biskuit ekstrusi — mixer, extruder, oven, packing.": "Extrusion biscuit production line — mixer, extruder, oven, packing.",
    "Line produksi gummy candy — pectin/gelatin, depositing, packing.": "Gummy candy production line — pectin/gelatin, depositing, packing.",
    "Line produksi permen keras — sugar/glucose, cooker, twist, bagger.": "Hard candy production line — sugar/glucose, cooker, twist, bagger.",
    "Gagal memuat data rekap. Pastikan sql/add_production_checklist.sql sudah dijalankan di Supabase. (": "Failed to load recap data. Make sure sql/add_production_checklist.sql has been run on Supabase. (",

    // ---- Lubrication ----
    "Isi Lubrication": "Fill Lubrication",
    "Rekap Lubrication": "Lubrication Recap",
    "Titik Lubrikasi": "Lubrication Point",
    "Titik Critical Belum Dilakukan": "Critical Points Not Done",
    "Kembali ke daftar line Lubrication": "Back to Lubrication line list",
    "Line tidak ditemukan. Kembali ke daftar line dan pilih lagi.": "Line not found. Go back to the line list and pick again.",
    "Isi checklist baru": "Fill in new checklist",
    "Qty terpakai (opsional)": "Qty used (optional)",
    "Keterangan (opsional)": "Notes (optional)",
    "Sudah": "Done",
    "Belum": "Not yet",
    "CRITICAL": "CRITICAL",
    "Data langsung tersimpan sebagai final — tidak ada proses review/approval untuk Lubrication.": "Data is saved directly as final — there is no review/approval process for Lubrication.",
    "Titik lubrikasi": "lubrication point",
    "critical point": "critical point",
    "Gagal memuat data rekap. Pastikan sql/add_lubrication_checklist.sql sudah dijalankan di Supabase. (": "Failed to load recap data. Make sure sql/add_lubrication_checklist.sql has been run on Supabase. (",
    "Tandai ": "Mark ",
    " tiap titik. Titik bertanda ": " each point. Points marked ",
    " wajib dicek tiap shift.": " must be checked every shift.",
    "Titik tidak ditemukan.": "Point not found.",

    // ---- Draft / Review ----
    "Draft — Maintenance App": "Draft — Maintenance App",
    "Tinjau laporan & checklist PM dari operator": "Review reports & PM checklists from operators",
    "Menunggu review": "Awaiting review",
    "Disetujui": "Approved",
    "Ditolak": "Rejected",
    "Approved": "Approved",
    "Rejected": "Rejected",
    "Semua": "All",
    "Review": "Review",
    "Approve": "Approve",
    "Reject": "Reject",
    "Tolak draft": "Reject draft",
    "Alasan penolakan": "Rejection reason",
    "Alasan Ditolak": "Rejection Reason",
    "Jelaskan alasan penolakan…": "Explain the reason for rejection…",
    "Isi dulu alasan penolakannya.": "Fill in the rejection reason first.",
    "Kirim penolakan": "Submit rejection",
    "Tidak ada data untuk tab ini.": "No data for this tab.",
    "Direview oleh": "Reviewed by",
    "Gagal memuat data draft. Pastikan sql/add_draft_workflow.sql dan sql/add_production_checklist.sql sudah dijalankan di Supabase. (": "Failed to load draft data. Make sure sql/add_draft_workflow.sql and sql/add_production_checklist.sql have been run on Supabase. (",
    "Gagal approve data. (": "Failed to approve data. (",
    "Gagal menolak data. (": "Failed to reject data. (",

    // ---- Notifikasi ----
    "Notifikasi draft": "Draft notifications",
    "Memuat…": "Loading…",
    "Tidak ada draft baru.": "No new drafts.",
    "Lihat semua draft": "View all drafts",
    "Notifikasi": "Notifications",
    "ada draft baru": "new draft",
    "Gagal kirim notifikasi ke SPV:": "Failed to send notification to SPV:",
    "Gagal menandai notifikasi terbaca:": "Failed to mark notification as read:",

    // ---- Kelola User ----
    "Kelola User — Maintenance App": "Manage Users — Maintenance App",
    "Akun operator, SPV, & superadmin": "Operator, SPV, & superadmin accounts",
    "Daftar user": "User list",
    "+ Tambah User": "+ Add User",
    "Tambah User": "Add User",
    "Tambah user": "Add user",
    "Edit User": "Edit User",
    "Ubah data user": "Edit user data",
    "Isi data akun baru.": "Fill in the new account's data.",
    "Ubah data akun. Password tidak diubah di sini — pakai tombol Reset password.": "Edit the account's data. The password is not changed here — use the Reset password button.",
    "Nama": "Name",
    "Nama lengkap": "Full name",
    "Role": "Role",
    "Operator": "Operator",
    "SPV": "SPV",
    "Superadmin": "Superadmin",
    "Password awal": "Initial password",
    "Minimal 6 karakter": "At least 6 characters",
    "Password minimal 6 karakter.": "Password must be at least 6 characters.",
    "Password baru": "New password",
    "Simpan password baru": "Save new password",
    "Reset password": "Reset password",
    "Aktifkan user": "Activate user",
    "Nonaktifkan user": "Deactivate user",
    "Belum ada akun.": "No accounts yet.",
    "Username sudah dipakai, pilih username lain.": "Username already in use, choose another one.",
    "Kamu tidak bisa mengubah role akun sendiri jadi bukan Superadmin.": "You can't change your own account's role to something other than Superadmin.",
    "Kamu tidak bisa menonaktifkan akun yang sedang kamu pakai sendiri.": "You can't deactivate the account you're currently using.",
    "Gagal memuat data user. Pastikan sql/add_user_accounts.sql sudah dijalankan di Supabase. (": "Failed to load user data. Make sure sql/add_user_accounts.sql has been run on Supabase. (",
    "Gagal menyimpan akun. (": "Failed to save account. (",
    "Gagal mengubah status akun. (": "Failed to change account status. (",
    "Gagal reset password. (": "Failed to reset password. (",

    // ---- Online Sekarang ----
    "Online Sekarang — Maintenance": "Online Now — Maintenance",
    "Siapa yang lagi buka app & posisi GPS terakhirnya": "Who's currently using the app and their last GPS position",
    "Akun online": "Accounts online",
    "Device online": "Devices online",
    "Ada titik lokasi": "Has a location point",
    "Total device tercatat": "Total devices recorded",
    "Peta lokasi terakhir": "Last known location map",
    "Titik cuma muncul untuk user yang mengizinkan akses lokasi di browser-nya. Warna hijau = online (update < 5 menit lalu), abu-abu = terakhir terlihat lebih lama.": "A point only shows for users who allowed location access in their browser. Green = online (updated < 5 minutes ago), gray = last seen longer ago.",
    "Update terakhir": "Last update",
    "Device": "Device",
    "Waktu": "Time",
    "Lokasi": "Location",
    "Cari aktor": "Search actor",
    "Username atau nama…": "Username or name…",
    "Belum ada data. Presence akan muncul begitu ada user yang login.": "No data yet. Presence will appear as soon as a user logs in.",
    "baru saja": "just now",
    "hari ini": "today",
    "Gagal memuat data online. Pastikan sql/add_user_presence.sql sudah dijalankan di Supabase. (": "Failed to load online data. Make sure sql/add_user_presence.sql has been run on Supabase. (",
    "Peta (Leaflet) gagal dimuat dari esm.sh (jaringan bermasalah atau esm.sh diblokir). (": "Map (Leaflet) failed to load from esm.sh (network issue or esm.sh is blocked). (",

    // ---- Export Data ----
    "Export Data — Maintenance App": "Export Data — Maintenance App",
    "Download data ke 1 file Excel, difilter tanggal & jenis data": "Download data into 1 Excel file, filtered by date & data type",
    "Jenis Data": "Data Type",
    "Jenis data": "Data type",
    "Semua jenis": "All types",
    "Filter tanggal berdasarkan": "Filter date based on",
    "Kosongkan tanggal \"Dari\"/\"Sampai\" kalau mau tanpa batas ke arah itu.": "Leave \"From\"/\"To\" blank if you don't want a limit in that direction.",
    "Pilih minimal 1 jenis data.": "Choose at least 1 data type.",
    "Tanggal \"Dari\" tidak boleh lebih besar dari tanggal \"Sampai\".": "The \"From\" date can't be later than the \"To\" date.",
    "Export data": "Export data",
    "File Excel hasil export berisi 1 sheet per jenis data yang dipilih. Data diambil langsung dari Supabase saat ini juga (bukan cadangan/backup terjadwal) — kalau datanya banyak, proses bisa makan waktu beberapa detik sebelum file kedownload.": "The exported Excel file contains 1 sheet per selected data type. Data is pulled directly from Supabase right now (not a scheduled backup) — if there's a lot of data, it may take a few seconds before the file downloads.",
    "Gagal export:": "Export failed:",

    // ---- Bersihkan Data ----
    "Bersihkan Data — Maintenance App": "Clean Up Data — Maintenance App",
    "Hapus permanen laporan/checklist lama yang sudah approved": "Permanently delete old reports/checklists that are already approved",
    "Approved & Rejected": "Approved & Rejected",
    "Direview sebelum tanggal": "Reviewed before date",
    "Isi dulu tanggal batasnya.": "Fill in the cutoff date first.",
    "Cari data": "Search data",
    "Belum ada data dicari.": "No search performed yet.",
    "Tidak ada data untuk filter ini.": "No data for this filter.",
    "Tidak ada data.": "No data.",
    "Hapus data terpilih": "Delete selected data",
    "Hapus data permanen": "Permanently delete data",
    "Hapus permanen?": "Delete permanently?",
    "⚠️ Data yang dihapus di sini": "⚠️ Data deleted here",
    "hilang permanen": "is permanently lost",
    "— termasuk foto-fotonya di storage. Tidak bisa dikembalikan. Data berstatus": "— including its photos in storage. Cannot be undone. Data with status",
    "sengaja tidak bisa dihapus lewat halaman ini (masih perlu direview SPV).": "cannot be deleted from this page on purpose (it still needs SPV review).",
    "Ya, hapus permanen": "Yes, delete permanently",
    "Gagal menghapus:": "Failed to delete:",

    // ---- Audit Log ----
    "Audit Log — Maintenance App": "Audit Log — Maintenance App",
    "Jejak aktivitas: login, kelola user, approve/reject, hapus data": "Activity trail: login, user management, approve/reject, data deletion",
    "Semua aksi": "All actions",
    "Aksi": "Action",
    "Aktor": "Actor",
    "Data terkait": "Related data",
    "Data Terkait": "Related Data",
    "Tanpa filter tanggal": "No date filter",
    "Gagal memuat audit log. Pastikan sql/add_audit_log.sql sudah dijalankan di Supabase. (": "Failed to load the audit log. Make sure sql/add_audit_log.sql has been run on Supabase. (",
    "Gagal mencatat audit log:": "Failed to record audit log:",

    // ---- Trend & Analytics ----
    "Trend & Analytics — Maintenance": "Trend & Analytics — Maintenance",
    "Pola breakdown & status mesin dari waktu ke waktu": "Breakdown patterns & machine status over time",
    "Rentang trend": "Trend range",
    "3 bulan terakhir": "Last 3 months",
    "6 bulan terakhir": "Last 6 months",
    "12 bulan terakhir": "Last 12 months",
    "Trend status per bulan": "Monthly status trend",
    "Berdasarkan data Laporan Mesin (semua status review)": "Based on Machine Report data (all review statuses)",
    "Distribusi status — bulan terpilih": "Status distribution — selected month",
    "Mesin paling sering breakdown — bulan terpilih": "Machines that break down most often — selected month",
    "Ranking lengkap — laporan per mesin (bulan terpilih)": "Full ranking — reports per machine (selected month)",
    "Tidak ada laporan Breakdown bulan ini. 🎉": "No Breakdown reports this month. 🎉",
    "Tidak ada breakdown pada bulan ini.": "No breakdowns this month.",
    "Belum ada laporan bulan ini.": "No reports yet this month.",
    "Belum ada laporan pada rentang ini.": "No reports yet in this range.",
    "Tidak ada laporan pada bulan ini.": "No reports this month.",
    "Gagal memuat grafik.": "Failed to load the chart.",
    "Gagal memuat data trend. Pastikan policy baca tabel laporan sudah dijalankan (lihat sql/add_rekap_read_policy.sql). (": "Failed to load trend data. Make sure the read policy for the report table has been applied (see sql/add_rekap_read_policy.sql). (",
    "Chart.js gagal dimuat dari esm.sh (jaringan bermasalah atau esm.sh diblokir). (": "Chart.js failed to load from esm.sh (network issue or esm.sh is blocked). (",

    // ---- QR Mesin ----
    "QR Mesin — Maintenance": "Machine QR — Maintenance",
    "QR Code Mesin — Savoria Kreasi Rasa": "Machine QR Code — Savoria Kreasi Rasa",
    "Cetak & tempel QR di tiap mesin untuk akses cepat checklist PM / Production": "Print & stick the QR on each machine for quick access to the PM / Production checklist",
    "Scan QR di mesin → checklist PM Utility / Production langsung terbuka": "Scan the QR on the machine → the Utility PM / Production checklist opens right away",
    "Scan untuk membuka checklist PM / Production mesin ini": "Scan to open this machine's PM / Production checklist",
    "🖶 Cetak semua": "🖶 Print all",
    "Tidak ada mesin yang cocok dengan filter ini.": "No machines match this filter.",

    // ---- Riwayat Mesin ----
    "Riwayat Mesin — Maintenance": "Machine History — Maintenance",
    "Histori laporan satu equipment dalam satu timeline": "One equipment's report history in a single timeline",
    "Pilih equipment untuk lihat semua histori laporannya": "Choose an equipment to see all of its report history",
    "Pilih area → mesin → equipment di atas, lalu klik \"Tampilkan riwayat\".": "Choose area → machine → equipment above, then click \"Show history\".",
    "Tampilkan riwayat": "Show history",
    "Total laporan": "Total reports",
    "Laporan terakhir": "Last report",
    "Timeline laporan": "Report timeline",
    "Memuat riwayat…": "Loading history…",
    "Belum ada laporan untuk equipment ini pada rentang yang dipilih.": "No reports yet for this equipment in the selected range.",
    "Foto": "Photo",
    "Jumlah foto": "Photo count",
    "Link Foto": "Photo link",
    "Gagal memuat riwayat. Pastikan policy baca tabel laporan sudah dijalankan (lihat sql/add_rekap_read_policy.sql). (": "Failed to load history. Make sure the read policy for the report table has been applied (see sql/add_rekap_read_policy.sql). (",
    "Gagal memuat ringkasan. Pastikan policy baca tabel laporan sudah dijalankan (lihat sql/add_rekap_read_policy.sql). (": "Failed to load the summary. Make sure the read policy for the report table has been applied (see sql/add_rekap_read_policy.sql). (",

    // ---- Offline ----
    "Offline — Maintenance App": "Offline — Maintenance App",
    "Koneksi terputus": "Connection lost",
    "Halaman ini butuh internet untuk memuat data terbaru. Coba lagi kalau sinyal sudah kembali.": "This page needs internet to load the latest data. Try again once your signal is back.",
    "Coba lagi": "Try again",

    // ---- Redirect ----
    "Dialihkan…": "Redirecting…",
    "Halaman ini sudah digabung. Mengalihkan ke": "This page has been merged. Redirecting to",

    // ---- Umum tambahan ----
    "Nama / tipe equipment": "Equipment name / type",
    "Lokasi / area": "Location / area",
    "Status": "Status",
    "Jenis": "Type",
    "Keterangan": "Remarks",
    "Menit": "Minute",
    "Tahun": "Year",
    "Bulan": "Month",
    "cth. budi.spv": "e.g. budi.spv",
    "mis. budi.spv": "e.g. budi.spv",

    // ---- Hari (Senin–Minggu) ----
    "Senin": "Monday",
    "Selasa": "Tuesday",
    "Rabu": "Wednesday",
    "Kamis": "Thursday",
    "Jumat": "Friday",
    "Sabtu": "Saturday",
    "Minggu": "Sunday",

    // ---- Bulan ----
    "Januari": "January",
    "Februari": "February",
    "Maret": "March",
    "April": "April",
    "Mei": "May",
    "Juni": "June",
    "Juli": "July",
    "Agustus": "August",
    "September": "September",
    "Oktober": "October",
    "November": "November",
    "Desember": "December",
  };

  // -------------------- POLA (teks dinamis berisi angka) --------------------
  // Tiap entri: [regex, fungsi(match) => teks EN]. Dicoba kalau exact-match
  // di DICT gagal.
  const PATTERNS = [
    [/^(\d+) data ditemukan\.?$/, (m) => `${m[1]} data found.`],
    [/^(\d+) checklist ditemukan$/, (m) => `${m[1]} checklists found`],
    [/^(\d+) laporan ditemukan$/, (m) => `${m[1]} reports found`],
    [/^(\d+) mesin ditemukan$/, (m) => `${m[1]} machines found`],
    [/^Hapus (\d+) data terpilih$/, (m) => `Delete ${m[1]} selected item(s)`],
    [/^(\d+)\+$/, (m) => `${m[1]}+`],
  ];

  // -------------------- state --------------------
  function getLang() {
    try {
      return localStorage.getItem(LANG_KEY) === "en" ? "en" : "id";
    } catch {
      return "id";
    }
  }
  function saveLang(lang) {
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {
      /* ignore */
    }
  }

  function translateCore(core) {
    if (Object.prototype.hasOwnProperty.call(DICT, core)) return DICT[core];
    for (const [re, fn] of PATTERNS) {
      const m = core.match(re);
      if (m) return fn(m);
    }
    return null;
  }

  function translate(str) {
    const leadMatch = str.match(/^\s*/);
    const trailMatch = str.match(/\s*$/);
    const lead = leadMatch ? leadMatch[0] : "";
    const trail = trailMatch ? trailMatch[0] : "";
    const core = str.slice(lead.length, str.length - trail.length);
    if (!core) return null;
    const en = translateCore(core);
    if (en == null) return null;
    return lead + en + trail;
  }

  // -------------------- simpan teks asli (untuk balik ke ID) --------------------
  const origTextMap = new WeakMap(); // Text node -> original ID string
  const origAttrMap = new WeakMap(); // Element -> { attr: original value }

  const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA"]);
  const ATTRS_TO_TRANSLATE = ["placeholder", "title", "aria-label"];

  function applyToTextNode(node, lang) {
    const raw = node.nodeValue;
    if (!raw || !raw.trim()) return;
    if (!origTextMap.has(node)) origTextMap.set(node, raw);
    const orig = origTextMap.get(node);
    if (lang === "id") {
      if (node.nodeValue !== orig) node.nodeValue = orig;
      return;
    }
    const en = translate(orig);
    if (en != null && node.nodeValue !== en) node.nodeValue = en;
  }

  function applyToAttr(el, attr, lang) {
    if (!el.hasAttribute(attr)) return;
    let store = origAttrMap.get(el);
    if (!store) {
      store = {};
      origAttrMap.set(el, store);
    }
    if (!(attr in store)) store[attr] = el.getAttribute(attr);
    const orig = store[attr];
    if (lang === "id") {
      if (el.getAttribute(attr) !== orig) el.setAttribute(attr, orig);
      return;
    }
    const en = translate(orig);
    if (en != null && el.getAttribute(attr) !== en) el.setAttribute(attr, en);
  }

  function walk(node, lang) {
    if (node.nodeType === Node.TEXT_NODE) {
      applyToTextNode(node, lang);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    if (SKIP_TAGS.has(node.tagName)) return;
    if (node.hasAttribute && node.hasAttribute("data-i18n-skip")) return;

    for (const attr of ATTRS_TO_TRANSLATE) applyToAttr(node, attr, lang);

    let child = node.firstChild;
    while (child) {
      walk(child, lang);
      child = child.nextSibling;
    }
  }

  function applyTitle(lang) {
    const el = document.querySelector("title");
    if (!el || !el.firstChild) return;
    walk(el, lang);
  }

  function applyAll(lang) {
    walk(document.body, lang);
    applyTitle(lang);
  }

  // -------------------- toggle UI --------------------
  function updateToggleUI() {
    const lang = getLang();
    document.querySelectorAll(".lang-toggle .lang-btn").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.lang === lang);
    });
  }

  function setLang(lang) {
    saveLang(lang);
    applyAll(lang);
    updateToggleUI();
  }

  function buildToggleEl() {
    const wrap = document.createElement("div");
    wrap.className = "lang-toggle";
    wrap.setAttribute("data-i18n-skip", "");
    wrap.innerHTML =
      '<button type="button" class="lang-btn" data-lang="id">ID</button>' +
      '<button type="button" class="lang-btn" data-lang="en">EN</button>';
    wrap.querySelectorAll(".lang-btn").forEach((btn) => {
      btn.addEventListener("click", () => setLang(btn.dataset.lang));
    });
    return wrap;
  }

  function injectToggle(root) {
    const bars = root.querySelectorAll
      ? root.querySelectorAll(".topbar-inner")
      : [];
    bars.forEach((bar) => {
      if (bar.querySelector(".lang-toggle")) return;
      // Sengaja di-append (bukan insertBefore menu-btn): menu-btn &
      // notif-bell-wrap posisinya position:absolute relatif ke .topbar,
      // jadi lepas dari flex flow topbar-inner — toggle ini aman ikut
      // flex flow biasa (didorong ke kanan lewat margin-left:auto di CSS).
      bar.appendChild(buildToggleEl());
    });
  }

  // -------------------- MutationObserver: tangkap konten baru dari JS --------------------
  let scheduled = false;
  const pendingNodes = [];

  function flushPending() {
    scheduled = false;
    const lang = getLang();
    const nodes = pendingNodes.splice(0, pendingNodes.length);
    for (const node of nodes) {
      if (!node.isConnected) continue;
      walk(node, lang);
      injectToggle(node.nodeType === Node.ELEMENT_NODE ? node : document);
    }
    updateToggleUI();
  }

  function schedule(node) {
    pendingNodes.push(node);
    if (scheduled) return;
    scheduled = true;
    (window.requestAnimationFrame || window.setTimeout)(flushPending, 0);
  }

  function observe() {
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === "childList") {
          m.addedNodes.forEach((n) => {
            if (n.nodeType === Node.ELEMENT_NODE || n.nodeType === Node.TEXT_NODE) {
              schedule(n);
            }
          });
        } else if (m.type === "characterData") {
          schedule(m.target);
        }
      }
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  function init() {
    if (!document.body) return;
    injectToggle(document);
    applyAll(getLang());
    updateToggleUI();
    observe();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // expose kecil buat debug/extend manual dari console kalau perlu
  window.SKR_I18N = { getLang, setLang, DICT };
})();
