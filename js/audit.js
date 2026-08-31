// ---------- AUDIT LOG ----------
// Modul kecil buat mencatat aktivitas penting (login/logout, kelola
// user, approve/reject draft, hapus data) ke tabel `audit_log`.
//
// Sengaja TIDAK import apa pun dari auth.js (biar auth.js sendiri bisa
// pakai modul ini dari dalam loginWithUsername()/logout() tanpa jadi
// import melingkar) — pemanggil kirim sendiri instance supabase client
// yang sudah mereka punya, plus data aktor yang relevan (dari
// getSession() di file masing-masing).
//
// Gagal mencatat audit TIDAK BOLEH menggagalkan aksi utamanya (login,
// approve, hapus data, dst) — makanya semua error di sini cuma
// di-console.error, tidak pernah dilempar ke pemanggil.

export const AUDIT_ACTION_LABEL = {
  login_berhasil: "Login berhasil",
  login_gagal: "Login gagal",
  logout: "Logout",
  user_tambah: "Tambah user",
  user_ubah: "Ubah data user",
  user_reset_password: "Reset password",
  user_aktifkan: "Aktifkan user",
  user_nonaktifkan: "Nonaktifkan user",
  approve: "Approve",
  reject: "Reject",
  hapus_data: "Hapus data permanen",
  export_data: "Export data",
};

export const AUDIT_ENTITY_LABEL = {
  auth: "Autentikasi",
  app_user: "Akun user",
  laporan: "Laporan Mesin",
  pm_checklist: "Checklist PM",
  production_checklist: "Checklist Production",
};

function toRow(entry) {
  return {
    actor_id: entry.actorId ?? null,
    actor_username: entry.actorUsername ?? null,
    actor_nama: entry.actorNama ?? null,
    actor_role: entry.actorRole ?? null,
    action: entry.action,
    entity_type: entry.entityType ?? null,
    entity_id: entry.entityId != null ? String(entry.entityId) : null,
    entity_label: entry.entityLabel ?? null,
    detail: entry.detail ?? null,
  };
}

// Catat 1 aktivitas. `supabase` = instance createClient() milik
// pemanggil (setiap halaman/module di app ini sudah punya sendiri).
export async function logAudit(supabase, entry) {
  return logAuditBulk(supabase, [entry]);
}

// Catat beberapa aktivitas sekaligus dalam 1 request (mis. hapus
// banyak data di Bersihkan Data) — lebih hemat daripada insert satu-satu.
export async function logAuditBulk(supabase, entries) {
  if (!entries || entries.length === 0) return;
  try {
    const { error } = await supabase.from("audit_log").insert(entries.map(toRow));
    if (error) console.error("Gagal mencatat audit log:", error);
  } catch (err) {
    console.error("Gagal mencatat audit log:", err);
  }
}
