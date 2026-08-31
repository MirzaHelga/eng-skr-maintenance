import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
import { logAudit } from "./audit.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const SESSION_KEY = "mtc-role-session";

// ---------- ROLE & PERMISSION MATRIX ----------
// Role granular per departemen (Utility / Production / Lubrication),
// sesuai matrix "Role and Permissions". Role lama "operator"/"spv"
// (generik, tanpa departemen) tetap dikenali di sini supaya akun lama
// yang sudah dinonaktifkan masih bisa tampil dengan label yang benar
// di halaman Kelola User — tapi tidak dipakai lagi untuk akun baru.
export const ROLE_LABEL = {
  operator_utility: "Operator Utility",
  operator_production: "Operator Production",
  operator_lubrication: "Operator Lubrication",
  spv_utility: "SPV Utility",
  spv_production: "SPV Production",
  spv_lubrication: "SPV Lubrication",
  hod_engineering: "HOD Engineering",
  superadmin: "Superadmin",
  // Legacy (nonaktif, dipertahankan untuk histori/tampilan saja)
  operator: "Operator (lama)",
  spv: "SPV (lama)",
};

// Semua role yang boleh dipilih untuk akun BARU lewat Kelola User.
export const ASSIGNABLE_ROLES = [
  "operator_utility",
  "operator_production",
  "operator_lubrication",
  "spv_utility",
  "spv_production",
  "spv_lubrication",
  "hod_engineering",
  "superadmin",
];

// Halaman default per role setelah login / kalau nyasar ke halaman
// yang bukan haknya.
export const DEFAULT_PAGE = {
  operator_utility: "laporan.html",
  operator_production: "laporan.html",
  operator_lubrication: "laporan.html",
  spv_utility: "dashboard.html",
  spv_production: "dashboard.html",
  spv_lubrication: "dashboard.html",
  hod_engineering: "dashboard.html",
  superadmin: "dashboard.html",
  // Legacy
  operator: "laporan.html",
  spv: "dashboard.html",
};

// Matrix Modul -> Role yang boleh akses, sesuai file
// "Role_and_permissions.xlsx". Ini SATU-SATUNYA sumber kebenaran untuk
// hak akses halaman & link sidebar — halaman HTML cukup ditandai
// dengan data-module="<key>", tidak perlu daftar role manual lagi.
export const PERMISSIONS = {
  dashboard: ["spv_utility", "spv_production", "spv_lubrication", "hod_engineering", "superadmin"],
  trend: ["spv_utility", "spv_production", "spv_lubrication", "hod_engineering", "superadmin"],
  reports: [
    "operator_utility",
    "operator_production",
    "operator_lubrication",
    "spv_utility",
    "spv_production",
    "spv_lubrication",
    "hod_engineering",
    "superadmin",
  ],
  utility: ["operator_utility", "spv_utility", "hod_engineering", "superadmin"],
  production: ["operator_production", "spv_production", "hod_engineering", "superadmin"],
  lubrication: ["operator_lubrication", "spv_lubrication", "hod_engineering", "superadmin"],
  qrcode: ["spv_utility", "spv_production", "spv_lubrication", "hod_engineering", "superadmin"],
  riwayat_mesin: ["spv_utility", "spv_production", "spv_lubrication", "hod_engineering", "superadmin"],
  draft: ["spv_utility", "spv_production", "spv_lubrication", "hod_engineering", "superadmin"],
  kelola_user: ["hod_engineering", "superadmin"],
  online: ["superadmin"],
  export_data: ["spv_utility", "spv_production", "spv_lubrication", "hod_engineering", "superadmin"],
  bersihkan_data: ["hod_engineering", "superadmin"],
  audit_log: ["superadmin"],
};

// Role setingkat SPV ke atas (punya tab "Rekap" di halaman
// checklist Utility/Production/Lubrication yang gabung Input+Rekap).
export function isSpvOrAbove(role) {
  return (
    role === "spv_utility" ||
    role === "spv_production" ||
    role === "spv_lubrication" ||
    role === "hod_engineering" ||
    role === "superadmin" ||
    role === "spv" // legacy
  );
}

function moduleAllowsRole(moduleKey, role) {
  const allowed = PERMISSIONS[moduleKey];
  if (!allowed) return false;
  return allowed.includes(role);
}

// ---------- HASH PASSWORD (SHA-256, lewat Web Crypto API bawaan browser) ----------
// Bukan sekuat bcrypt/argon2, tapi jauh lebih baik daripada plain text,
// dan tidak butuh library tambahan. Dipakai baik saat login (cocokkan
// hash) maupun saat superadmin bikin/ubah password akun (modul
// berikutnya).
export async function hashPassword(password) {
  const data = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ---------- LOGIN (akun per orang, dari tabel app_user) ----------
// Return: { ok: true, user } kalau berhasil, atau { ok: false, reason }
// reason: "not_found" | "wrong_password" | "inactive" | "error"
export async function loginWithUsername(username, password) {
  const uname = (username || "").trim().toLowerCase();
  if (!uname) return { ok: false, reason: "not_found" };

  const { data, error } = await supabase
    .from("app_user")
    .select("id, username, nama, role, password_hash, is_active")
    .eq("username", uname)
    .maybeSingle();

  if (error) {
    console.error(error);
    return { ok: false, reason: "error" };
  }
  if (!data) {
    logAudit(supabase, {
      action: "login_gagal",
      entityType: "auth",
      entityLabel: uname,
      detail: "Username tidak ditemukan",
    });
    return { ok: false, reason: "not_found" };
  }
  if (!data.is_active) {
    logAudit(supabase, {
      action: "login_gagal",
      entityType: "auth",
      entityLabel: uname,
      detail: "Akun dinonaktifkan",
    });
    return { ok: false, reason: "inactive" };
  }

  const hash = await hashPassword(password);
  if (hash !== data.password_hash) {
    logAudit(supabase, {
      action: "login_gagal",
      entityType: "auth",
      entityLabel: uname,
      detail: "Password salah",
    });
    return { ok: false, reason: "wrong_password" };
  }

  logAudit(supabase, {
    actorId: data.id,
    actorUsername: data.username,
    actorNama: data.nama,
    actorRole: data.role,
    action: "login_berhasil",
    entityType: "auth",
    entityId: data.id,
    entityLabel: data.username,
  });

  return { ok: true, user: data };
}

// ---------- SESSION ----------
export function getSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.role) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function getRole() {
  return getSession()?.role || null;
}

// user = baris dari tabel app_user (id, username, nama, role, ...)
export function setSession(user) {
  sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      userId: user.id,
      username: user.username,
      role: user.role,
      nama: (user.nama || "").trim(),
      loginAt: Date.now(),
    })
  );
}

export async function logout() {
  const session = getSession();
  if (session) {
    await logAudit(supabase, {
      actorId: session.userId,
      actorUsername: session.username,
      actorNama: session.nama,
      actorRole: session.role,
      action: "logout",
      entityType: "auth",
      entityId: session.userId,
      entityLabel: session.username,
    });
    // Hapus baris presence device INI aja (bukan semua device akun ini)
    // biar langsung hilang dari "Online Sekarang" begitu logout, tanpa
    // ganggu device lain yang masih login pakai akun yang sama. Gagal
    // pun tidak masalah, nanti otomatis hilang sendiri karena updated_at
    // basi.
    try {
      await supabase
        .from("user_presence")
        .delete()
        .eq("user_id", session.userId)
        .eq("device_id", getDeviceId());
    } catch (err) {
      console.warn("Gagal hapus presence saat logout:", err);
    }
  }
  sessionStorage.removeItem(SESSION_KEY);
  window.location.href = "index.html";
}

// Nama yang tampil di kolom "diinput/direview oleh" — pakai nama akun
// yang tersimpan di database, fallback ke username atau label role.
export function displayName() {
  const session = getSession();
  if (!session) return "";
  const label = ROLE_LABEL[session.role] || session.role;
  const who = session.nama || session.username;
  return who ? `${who} (${label})` : label;
}

function currentPageFile() {
  const path = window.location.pathname;
  return path.substring(path.lastIndexOf("/") + 1) || "index.html";
}

// ---------- PAGE GUARD ----------
// Dipanggil otomatis di bawah file ini. Halaman yang mau dijaga tinggal
// kasih atribut data-module="utility" di <body> (key sesuai
// PERMISSIONS di atas). Halaman tanpa atribut itu (mis. login.html)
// dibiarkan lewat.
function guard() {
  const body = document.body;
  const moduleKey = body?.dataset?.module;
  if (!moduleKey) return;

  const session = getSession();

  if (!session) {
    window.location.href = "index.html?next=" + encodeURIComponent(currentPageFile());
    return;
  }
  if (!moduleAllowsRole(moduleKey, session.role)) {
    window.location.href = DEFAULT_PAGE[session.role] || "index.html";
    return;
  }

  initShell(session.role);
  startPresenceTracking(session);
}

// ---------- SIDEBAR + TOPBAR SESUAI ROLE ----------
function initShell(role) {
  // Sembunyikan link sidebar yang bukan hak role ini. Tiap link
  // ditandai data-module="<key>" sesuai PERMISSIONS di atas.
  document.querySelectorAll(".sidebar-link[data-module]").forEach((link) => {
    if (!moduleAllowsRole(link.dataset.module, role)) {
      link.remove();
    }
  });

  addSidebarFooter(role);

  if (isSpvOrAbove(role)) {
    setupNotificationBell();
  }
}

function addSidebarFooter(role) {
  const sidebar = document.getElementById("sidebar");
  if (!sidebar) return;

  const footer = document.createElement("div");
  footer.className = "sidebar-footer";
  const session = getSession();
  const namaText = session?.nama ? escapeHtml(session.nama) : ROLE_LABEL[role];
  footer.innerHTML = `
    <div class="sidebar-role">
      <span class="sidebar-role-dot sidebar-role-dot--${role}"></span>
      <div>
        <p class="sidebar-role-name">${namaText}</p>
        <p class="sidebar-role-label">${ROLE_LABEL[role]}</p>
      </div>
    </div>
    <button type="button" class="sidebar-logout" id="btn-logout">Keluar</button>
  `;
  sidebar.appendChild(footer);
  footer.querySelector("#btn-logout").addEventListener("click", logout);
}

// ---------- LONCENG NOTIFIKASI (khusus SPV) ----------
async function setupNotificationBell() {
  const topbarInner = document.querySelector(".topbar-inner");
  const menuBtn = document.getElementById("btn-menu");
  if (!topbarInner) return;

  const bellWrap = document.createElement("div");
  bellWrap.className = "notif-bell-wrap";
  bellWrap.innerHTML = `
    <button type="button" class="notif-bell" id="notif-bell" aria-label="Notifikasi">
      🔔
      <span class="notif-badge" id="notif-badge" hidden>0</span>
    </button>
    <div class="notif-dropdown" id="notif-dropdown" hidden>
      <p class="notif-dropdown-title">Notifikasi draft</p>
      <div class="notif-list" id="notif-list">
        <p class="notif-empty">Memuat…</p>
      </div>
      <a href="draft.html" class="notif-see-all">Lihat semua draft</a>
    </div>
  `;

  if (menuBtn) {
    topbarInner.insertBefore(bellWrap, menuBtn);
  } else {
    topbarInner.appendChild(bellWrap);
  }

  const overlay = document.createElement("div");
  overlay.className = "notif-overlay";
  overlay.id = "notif-overlay";
  overlay.hidden = true;
  document.body.appendChild(overlay);

  const bellBtn = bellWrap.querySelector("#notif-bell");
  const dropdown = bellWrap.querySelector("#notif-dropdown");
  const badge = bellWrap.querySelector("#notif-badge");
  const list = bellWrap.querySelector("#notif-list");

  function toggleDropdown(show) {
    dropdown.hidden = !show;
    overlay.hidden = !show;
  }

  async function refresh() {
    const { data, error } = await supabase
      .from("notifikasi")
      .select("id, tipe, judul, pesan, created_at")
      .eq("dibaca", false)
      .order("created_at", { ascending: false })
      .limit(8);

    if (error) {
      console.error(error);
      return;
    }

    const rows = data || [];
    if (rows.length === 0) {
      badge.hidden = true;
      list.innerHTML = `<p class="notif-empty">Tidak ada draft baru.</p>`;
      return;
    }

    badge.hidden = false;
    badge.textContent = rows.length > 9 ? "9+" : String(rows.length);
    list.innerHTML = rows
      .map(
        (n) => `
        <a href="draft.html" class="notif-item">
          <p class="notif-item-title">${escapeHtml(n.judul)}</p>
          <p class="notif-item-sub">${escapeHtml(n.pesan || "")}</p>
        </a>
      `
      )
      .join("");
  }

  bellBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleDropdown(dropdown.hidden);
  });
  document.addEventListener("click", (e) => {
    if (!bellWrap.contains(e.target)) toggleDropdown(false);
  });
  overlay.addEventListener("click", () => toggleDropdown(false));

  refresh();
  // Polling ringan, bukan realtime — cukup buat kebutuhan "ada draft baru".
  setInterval(refresh, 30000);
}

// ---------- PRESENCE (Online Sekarang) ----------
// Kirim "heartbeat" berkala ke tabel user_presence: nama, role, device,
// halaman yang lagi dibuka, dan lokasi GPS terakhir (kalau user
// mengizinkan). Dipanggil otomatis dari guard() di semua halaman yang
// sudah login — tidak perlu ditambah manual di tiap HTML.
const PRESENCE_INTERVAL_MS = 60000; // 1 menit
const DEVICE_ID_KEY = "mtc-device-id";

// ID acak per device/browser, disimpan di localStorage (BUKAN
// sessionStorage) supaya tetap sama walau logout-login berkali-kali di
// device yang sama — jadi 1 akun yang dipakai di 2 HP tetap kelihatan
// sebagai 2 baris terpisah di "Online Sekarang", bukan saling menimpa.
function getDeviceId() {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

// Label device yang gampang dibaca, mis. "Android · Chrome" atau
// "iPhone · Safari" — bukan deteksi presisi, cukup buat gambaran umum.
function getDeviceLabel() {
  const ua = navigator.userAgent || "";

  let os = "Desktop";
  if (/iPad/i.test(ua)) os = "iPad";
  else if (/iPhone/i.test(ua)) os = "iPhone";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/Macintosh/i.test(ua)) os = "Mac";
  else if (/Windows/i.test(ua)) os = "Windows";
  else if (/Linux/i.test(ua)) os = "Linux";

  let browser = "Browser";
  if (/EdgA?\//i.test(ua)) browser = "Edge";
  else if (/OPR\/|Opera/i.test(ua)) browser = "Opera";
  else if (/CriOS\//i.test(ua)) browser = "Chrome";
  else if (/FxiOS\/|Firefox\//i.test(ua)) browser = "Firefox";
  else if (/Chrome\//i.test(ua)) browser = "Chrome";
  else if (/Safari\//i.test(ua)) browser = "Safari";

  return `${os} · ${browser}`;
}

function sendPresenceHeartbeat(session, position) {
  const row = {
    user_id: session.userId,
    device_id: getDeviceId(),
    device_label: getDeviceLabel(),
    username: session.username,
    nama: session.nama,
    role: session.role,
    halaman: currentPageFile(),
    updated_at: new Date().toISOString(),
  };
  if (position) {
    row.latitude = position.coords.latitude;
    row.longitude = position.coords.longitude;
    row.accuracy = position.coords.accuracy;
  }
  supabase
    .from("user_presence")
    .upsert(row, { onConflict: "user_id,device_id" })
    .then(({ error }) => {
      if (error) console.warn("Gagal kirim presence:", error);
    });
}

function startPresenceTracking(session) {
  const tick = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => sendPresenceHeartbeat(session, pos),
        // Izin ditolak / gagal ambil lokasi -> tetap kirim heartbeat TANPA
        // koordinat, supaya device ini tetap kelihatan online di halaman
        // "Online Sekarang", cuma tanpa titik di peta.
        () => sendPresenceHeartbeat(session, null),
        { enableHighAccuracy: false, maximumAge: 60000, timeout: 10000 }
      );
    } else {
      sendPresenceHeartbeat(session, null);
    }
  };
  tick();
  setInterval(tick, PRESENCE_INTERVAL_MS);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

guard();
