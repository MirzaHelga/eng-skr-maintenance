import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
import { AUDIT_ACTION_LABEL, AUDIT_ENTITY_LABEL } from "./audit.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Batas jumlah baris per pencarian, supaya query tetap ringan. Kalau
// masih ada sisa, persempit dulu filter tanggal/aksi-nya.
const ROW_LIMIT = 300;

// ---------- ELEMENTS ----------
const fAksi = document.getElementById("al-aksi");
const fEntitas = document.getElementById("al-entitas");
const fAktor = document.getElementById("al-aktor");
const fDari = document.getElementById("al-tanggal-dari");
const fSampai = document.getElementById("al-tanggal-sampai");
const btnFilter = document.getElementById("btn-filter");
const btnReset = document.getElementById("btn-reset");

const auditCount = document.getElementById("audit-count");
const auditError = document.getElementById("audit-error");
const auditTbody = document.getElementById("audit-tbody");
const btnExport = document.getElementById("btn-export");

let currentRows = []; // hasil pencarian terakhir — dipakai buat export

// Kelompokkan tiap aksi jadi "rasa" warna badge: positif/negatif/netral.
const ACTION_TONE = {
  login_berhasil: "success",
  user_tambah: "neutral",
  user_ubah: "neutral",
  user_reset_password: "neutral",
  user_aktifkan: "success",
  approve: "success",
  login_gagal: "danger",
  user_nonaktifkan: "danger",
  reject: "danger",
  hapus_data: "danger",
  logout: "muted",
};

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function showError(msg) {
  auditError.hidden = false;
  auditError.textContent = msg;
}
function clearError() {
  auditError.hidden = true;
  auditError.textContent = "";
}

function formatWaktu(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function actionBadge(action) {
  const label = AUDIT_ACTION_LABEL[action] || action;
  const tone = ACTION_TONE[action] || "neutral";
  return `<span class="audit-badge audit-badge--${tone}">${escapeHtml(label)}</span>`;
}

// ---------- ISI DROPDOWN FILTER ----------
function initFilterOptions() {
  for (const [value, label] of Object.entries(AUDIT_ACTION_LABEL)) {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = label;
    fAksi.appendChild(opt);
  }
  for (const [value, label] of Object.entries(AUDIT_ENTITY_LABEL)) {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = label;
    fEntitas.appendChild(opt);
  }
}

// ---------- MUAT DATA ----------
async function loadLog() {
  clearError();
  auditCount.textContent = "Memuat data…";
  auditTbody.innerHTML = `<tr><td colspan="5" class="table-empty">Memuat data…</td></tr>`;
  btnExport.disabled = true;

  let query = supabase
    .from("audit_log")
    .select("id, created_at, actor_username, actor_nama, actor_role, action, entity_type, entity_label, detail")
    .order("created_at", { ascending: false })
    .limit(ROW_LIMIT);

  if (fAksi.value) query = query.eq("action", fAksi.value);
  if (fEntitas.value) query = query.eq("entity_type", fEntitas.value);
  if (fDari.value) query = query.gte("created_at", `${fDari.value}T00:00:00`);
  if (fSampai.value) query = query.lte("created_at", `${fSampai.value}T23:59:59`);

  const aktor = fAktor.value.trim();
  if (aktor) {
    query = query.or(`actor_username.ilike.%${aktor}%,actor_nama.ilike.%${aktor}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error(error);
    showError(
      "Gagal memuat audit log. Pastikan sql/add_audit_log.sql sudah dijalankan di Supabase. (" +
        (error.message || "unknown error") +
        ")"
    );
    auditCount.textContent = "";
    auditTbody.innerHTML = "";
    return;
  }

  currentRows = data || [];
  auditCount.textContent =
    currentRows.length >= ROW_LIMIT
      ? `Menampilkan ${currentRows.length} data terbaru (mungkin masih ada sisa — persempit filter tanggal/aksi).`
      : `${currentRows.length} data ditemukan.`;
  btnExport.disabled = currentRows.length === 0;
  renderTable();
}

function renderTable() {
  if (currentRows.length === 0) {
    auditTbody.innerHTML = `<tr><td colspan="5" class="table-empty">Tidak ada data untuk filter ini.</td></tr>`;
    return;
  }

  auditTbody.innerHTML = currentRows
    .map((row) => {
      const aktor = row.actor_nama || row.actor_username || "-";
      const peran = row.actor_role ? ` <span class="table-sub">(${escapeHtml(row.actor_role)})</span>` : "";
      const entitas = row.entity_label
        ? `${escapeHtml(row.entity_label)}${
            row.entity_type ? ` <span class="table-sub">(${escapeHtml(AUDIT_ENTITY_LABEL[row.entity_type] || row.entity_type)})</span>` : ""
          }`
        : row.entity_type
        ? escapeHtml(AUDIT_ENTITY_LABEL[row.entity_type] || row.entity_type)
        : "-";
      return `
        <tr>
          <td>${formatWaktu(row.created_at)}</td>
          <td>${escapeHtml(aktor)}${peran}</td>
          <td>${actionBadge(row.action)}</td>
          <td>${entitas}</td>
          <td>${row.detail ? escapeHtml(row.detail) : "-"}</td>
        </tr>
      `;
    })
    .join("");
}

btnFilter.addEventListener("click", loadLog);

btnReset.addEventListener("click", () => {
  fAksi.value = "";
  fEntitas.value = "";
  fAktor.value = "";
  fDari.value = "";
  fSampai.value = "";
  loadLog();
});

fAktor.addEventListener("keydown", (e) => {
  if (e.key === "Enter") loadLog();
});

// ---------- EXPORT KE EXCEL ----------
btnExport.addEventListener("click", () => {
  if (currentRows.length === 0) return;

  const exportData = currentRows.map((row) => ({
    Waktu: formatWaktu(row.created_at),
    Aktor: row.actor_nama || row.actor_username || "-",
    Username: row.actor_username || "-",
    Peran: row.actor_role || "-",
    Aksi: AUDIT_ACTION_LABEL[row.action] || row.action,
    "Jenis Data": AUDIT_ENTITY_LABEL[row.entity_type] || row.entity_type || "-",
    "Data Terkait": row.entity_label || "-",
    Keterangan: row.detail || "-",
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  worksheet["!cols"] = [
    { wch: 20 }, // Waktu
    { wch: 18 }, // Aktor
    { wch: 16 }, // Username
    { wch: 12 }, // Peran
    { wch: 18 }, // Aksi
    { wch: 20 }, // Jenis Data
    { wch: 26 }, // Data Terkait
    { wch: 40 }, // Keterangan
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Audit Log");

  const today = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const filename = `audit-log_${today.getFullYear()}${pad(today.getMonth() + 1)}${pad(today.getDate())}.xlsx`;

  XLSX.writeFile(workbook, filename);
});

initFilterOptions();
loadLog();
