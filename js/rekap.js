import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---------- ELEMENTS ----------
const fTanggalDari = document.getElementById("f-tanggal-dari");
const fTanggalSampai = document.getElementById("f-tanggal-sampai");
const fArea = document.getElementById("f-area");
const fStatus = document.getElementById("f-status");
const btnFilter = document.getElementById("btn-filter");
const btnReset = document.getElementById("btn-reset");

const rekapCount = document.getElementById("rekap-count");
const rekapError = document.getElementById("rekap-error");
const rekapTbody = document.getElementById("rekap-tbody");
const btnExport = document.getElementById("btn-export");

// baris yang sedang tampil (hasil filter terakhir) — ini yang dipakai export
let currentRows = [];

// ---------- INIT (halaman ini sudah dijaga role SPV lewat auth.js) ----------
async function init() {
  await loadAreaFilter();
  await loadLaporan();
}

init();

async function loadAreaFilter() {
  const { data, error } = await supabase.from("area").select("id, nama").order("nama");
  if (error) {
    console.error(error);
    return;
  }
  for (const area of data) {
    const opt = document.createElement("option");
    opt.value = area.id;
    opt.textContent = area.nama;
    fArea.appendChild(opt);
  }
}

// ---------- MUAT DATA LAPORAN ----------
function showError(msg) {
  rekapError.textContent = msg;
  rekapError.hidden = false;
}

function clearError() {
  rekapError.hidden = true;
  rekapError.textContent = "";
}

const STATUS_CLASS = {
  Running: "running",
  Standby: "standby",
  Maintenance: "maintenance",
  Breakdown: "breakdown",
};

const REVIEW_LABEL = {
  draft: "Menunggu review",
  approved: "Disetujui",
  rejected: "Ditolak",
};

async function loadLaporan() {
  clearError();
  btnExport.disabled = true;
  rekapCount.textContent = "Memuat data…";
  rekapTbody.innerHTML = `<tr><td colspan="12" class="table-empty">Memuat data…</td></tr>`;

  let query = supabase
    .from("laporan")
    .select("tanggal, jam_mulai, jam_selesai, shift, status, deskripsi, pic, review_status, reviewed_by, reject_reason, area:area_id(nama), mesin:mesin_id(nama), equipment:equipment_id(nama), laporan_foto(foto_url)")
    .order("tanggal", { ascending: false })
    .order("jam_mulai", { ascending: false });

  if (fTanggalDari.value) query = query.gte("tanggal", fTanggalDari.value);
  if (fTanggalSampai.value) query = query.lte("tanggal", fTanggalSampai.value);
  if (fArea.value) query = query.eq("area_id", fArea.value);
  if (fStatus.value) query = query.eq("status", fStatus.value);

  const { data, error } = await query;

  if (error) {
    console.error(error);
    showError(
      "Gagal memuat data rekap. Pastikan policy baca tabel laporan sudah dijalankan (lihat add_rekap_read_policy.sql). (" +
        (error.message || "unknown error") +
        ")"
    );
    rekapCount.textContent = "";
    rekapTbody.innerHTML = `<tr><td colspan="11" class="table-empty">Gagal memuat data.</td></tr>`;
    return;
  }

  currentRows = data || [];
  renderTable(currentRows);
  rekapCount.textContent = `${currentRows.length} laporan ditemukan`;
  btnExport.disabled = currentRows.length === 0;
}

function renderTable(rows) {
  if (rows.length === 0) {
    rekapTbody.innerHTML = `<tr><td colspan="12" class="table-empty">Tidak ada laporan untuk filter ini.</td></tr>`;
    return;
  }

  rekapTbody.innerHTML = "";
  for (const row of rows) {
    const tr = document.createElement("tr");
    const statusClass = STATUS_CLASS[row.status] || "";
    tr.innerHTML = `
      <td>${formatTanggal(row.tanggal)}</td>
      <td>${row.jam_mulai ? row.jam_mulai.slice(0, 5) : ""}</td>
      <td>${row.jam_selesai ? row.jam_selesai.slice(0, 5) : ""}</td>
      <td>${row.shift ?? ""}</td>
      <td>${row.area?.nama ?? ""}</td>
      <td>${row.mesin?.nama ?? ""}</td>
      <td>${row.equipment?.nama ?? ""}</td>
      <td><span class="status-badge status-${statusClass}">${row.status ?? ""}</span></td>
      <td class="col-deskripsi">${escapeHtml(row.deskripsi ?? "")}</td>
      <td>${row.pic ?? ""}</td>
      <td>${renderFotoLinks(row.laporan_foto)}</td>
      <td>${renderReviewBadge(row)}</td>
    `;
    rekapTbody.appendChild(tr);
  }
}

function renderReviewBadge(row) {
  const label = REVIEW_LABEL[row.review_status] || row.review_status || "";
  let html = `<span class="review-badge review-badge--${row.review_status}">${label}</span>`;
  if (row.review_status === "rejected" && row.reject_reason) {
    html += `<p class="rekap-reject-reason">${escapeHtml(row.reject_reason)}</p>`;
  }
  return html;
}

function renderFotoLinks(fotos) {
  if (!fotos || fotos.length === 0) return "—";
  return fotos
    .map((f, i) => `<a href="${f.foto_url}" target="_blank" rel="noopener">Foto ${i + 1}</a>`)
    .join(" · ");
}

function formatTanggal(tanggal) {
  if (!tanggal) return "";
  const [y, m, d] = tanggal.split("-");
  return `${d}-${m}-${y}`;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ---------- FILTER ----------
btnFilter.addEventListener("click", () => loadLaporan());

btnReset.addEventListener("click", () => {
  fTanggalDari.value = "";
  fTanggalSampai.value = "";
  fArea.value = "";
  fStatus.value = "";
  loadLaporan();
});

// ---------- EXPORT KE EXCEL ----------
btnExport.addEventListener("click", () => {
  if (currentRows.length === 0) return;

  const exportData = currentRows.map((row) => ({
    Tanggal: formatTanggal(row.tanggal),
    "Jam Mulai": row.jam_mulai ? row.jam_mulai.slice(0, 5) : "",
    "Jam Selesai": row.jam_selesai ? row.jam_selesai.slice(0, 5) : "",
    Shift: row.shift ?? "",
    Area: row.area?.nama ?? "",
    Mesin: row.mesin?.nama ?? "",
    Equipment: row.equipment?.nama ?? "",
    Status: row.status ?? "",
    Deskripsi: row.deskripsi ?? "",
    PIC: row.pic ?? "",
    "Link Foto": (row.laporan_foto || []).map((f) => f.foto_url).join("; "),
    Review: REVIEW_LABEL[row.review_status] || row.review_status || "",
    "Alasan Ditolak": row.reject_reason ?? "",
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  worksheet["!cols"] = [
    { wch: 11 }, // Tanggal
    { wch: 9 },  // Jam Mulai
    { wch: 9 },  // Jam Selesai
    { wch: 9 },  // Shift
    { wch: 16 }, // Area
    { wch: 18 }, // Mesin
    { wch: 20 }, // Equipment
    { wch: 12 }, // Status
    { wch: 45 }, // Deskripsi
    { wch: 16 }, // PIC
    { wch: 30 }, // Link Foto
    { wch: 16 }, // Review
    { wch: 30 }, // Alasan Ditolak
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Mesin");

  const today = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const filename = `rekap-laporan-mesin_${today.getFullYear()}${pad(today.getMonth() + 1)}${pad(today.getDate())}.xlsx`;

  XLSX.writeFile(workbook, filename);
});
