import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
import { LUBRICATION_LINES } from "./lubrication-data.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---------- ELEMENTS ----------
const fTanggalDari = document.getElementById("f-tanggal-dari");
const fTanggalSampai = document.getElementById("f-tanggal-sampai");
const fLine = document.getElementById("f-line");
const btnFilter = document.getElementById("btn-filter");
const btnReset = document.getElementById("btn-reset");

const rekapCount = document.getElementById("rekap-count");
const rekapError = document.getElementById("rekap-error");
const rekapTbody = document.getElementById("rekap-tbody");
const btnExport = document.getElementById("btn-export");

const detailOverlay = document.getElementById("pm-detail-overlay");
const detailClose = document.getElementById("pm-detail-close");
const detailTitle = document.getElementById("pm-detail-title");
const detailSub = document.getElementById("pm-detail-sub");
const detailMeta = document.getElementById("pm-detail-meta");
const detailBody = document.getElementById("pm-detail-body");
const detailFoto = document.getElementById("pm-detail-foto");
const detailCatatan = document.getElementById("pm-detail-catatan");

// baris yang sedang tampil (hasil filter terakhir) — ini yang dipakai export
let currentRows = [];

const REVIEW_LABEL = {
  draft: "Menunggu review",
  approved: "Disetujui",
  rejected: "Ditolak",
};

// ---------- INIT (halaman ini sudah dijaga role SPV lewat lubrication-tabs.js) ----------
async function init() {
  loadFilterOptions();
  await loadSubmissions();
}

init();

function loadFilterOptions() {
  for (const line of LUBRICATION_LINES) {
    const opt = document.createElement("option");
    opt.value = line.key;
    opt.textContent = line.label;
    fLine.appendChild(opt);
  }
}

// ---------- MUAT DATA CHECKLIST ----------
function showError(msg) {
  rekapError.textContent = msg;
  rekapError.hidden = false;
}

function clearError() {
  rekapError.hidden = true;
  rekapError.textContent = "";
}

function countCriticalBelum(items) {
  return (items || []).filter((it) => it.critical && it.dilakukan === "Belum").length;
}

async function loadSubmissions() {
  clearError();
  btnExport.disabled = true;
  rekapCount.textContent = "Memuat data…";
  rekapTbody.innerHTML = `<tr><td colspan="10" class="table-empty">Memuat data…</td></tr>`;

  let query = supabase
    .from("lubrication_checklist_submission")
    .select(
      "id, line_key, line_label, kategori_frekuensi_label, bulan_tahun, items, tanggal_inspeksi, checked_by_opr, catatan, review_status, reviewed_by, reject_reason, lubrication_checklist_foto(foto_url, item_no, item_titik)"
    )
    .order("tanggal_inspeksi", { ascending: false })
    .order("created_at", { ascending: false });

  if (fTanggalDari.value) query = query.gte("tanggal_inspeksi", fTanggalDari.value);
  if (fTanggalSampai.value) query = query.lte("tanggal_inspeksi", fTanggalSampai.value);
  if (fLine.value) query = query.eq("line_key", fLine.value);

  const { data, error } = await query;

  if (error) {
    console.error(error);
    showError(
      "Gagal memuat data rekap. Pastikan sql/10_add_lubrication_checklist.sql, sql/15_add_lubrication_draft_workflow.sql, dan sql/16_add_lubrication_kategori_frekuensi.sql sudah dijalankan di Supabase. (" +
        (error.message || "unknown error") +
        ")"
    );
    rekapCount.textContent = "";
    rekapTbody.innerHTML = `<tr><td colspan="10" class="table-empty">Gagal memuat data.</td></tr>`;
    return;
  }

  currentRows = data || [];
  renderTable(currentRows);
  rekapCount.textContent = `${currentRows.length} checklist ditemukan`;
  btnExport.disabled = currentRows.length === 0;
}

// "Checked by SPV" bukan isian manual — diambil dari siapa yang
// approve/reject checklist ini di halaman Draft (kolom reviewed_by).
// Selama masih draft (belum direview), belum ada nama SPV untuk ditampilkan.
function spvChecker(row) {
  return row.review_status !== "draft" ? row.reviewed_by || "" : "";
}

function renderReviewBadge(row) {
  const label = REVIEW_LABEL[row.review_status] || row.review_status || "";
  let html = `<span class="review-badge review-badge--${row.review_status}">${label}</span>`;
  if (row.review_status === "rejected" && row.reject_reason) {
    html += `<p class="rekap-reject-reason">${escapeHtml(row.reject_reason)}</p>`;
  }
  return html;
}

function renderTable(rows) {
  if (rows.length === 0) {
    rekapTbody.innerHTML = `<tr><td colspan="10" class="table-empty">Tidak ada checklist untuk filter ini.</td></tr>`;
    return;
  }

  rekapTbody.innerHTML = "";
  for (const row of rows) {
    const critBelum = countCriticalBelum(row.items);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${formatTanggal(row.tanggal_inspeksi)}</td>
      <td>${escapeHtml(row.line_label ?? "")}</td>
      <td>${escapeHtml(row.kategori_frekuensi_label || "—")}</td>
      <td>${escapeHtml(row.bulan_tahun ?? "")}</td>
      <td>${escapeHtml(row.checked_by_opr ?? "")}</td>
      <td>${escapeHtml(spvChecker(row) || "—")}</td>
      <td>${critBelum > 0 ? `<span class="lube-critical-badge">${critBelum}</span>` : "—"}</td>
      <td>${renderFotoLinks(row.lubrication_checklist_foto)}</td>
      <td>${renderReviewBadge(row)}</td>
      <td><button type="button" class="btn-link-btn pm-detail-btn">Lihat detail</button></td>
    `;
    tr.querySelector(".pm-detail-btn").addEventListener("click", () => openDetail(row));
    rekapTbody.appendChild(tr);
  }
}

function renderFotoLinks(fotos) {
  if (!fotos || fotos.length === 0) return "—";
  return fotos
    .map((f, i) => {
      const label = f.item_titik ? `Foto ${escapeHtml(f.item_titik)}` : `Foto ${i + 1}`;
      return `<a href="${f.foto_url}" target="_blank" rel="noopener">${label}</a>`;
    })
    .join(", ");
}

// ---------- DETAIL MODAL ----------
function openDetail(row) {
  detailTitle.textContent = `Lubrication — ${row.line_label ?? ""}${row.kategori_frekuensi_label ? ` · ${row.kategori_frekuensi_label}` : ""}`;
  detailSub.textContent = `${formatTanggal(row.tanggal_inspeksi)}${row.bulan_tahun ? ` · ${row.bulan_tahun}` : ""}`;

  detailMeta.innerHTML = `
    <div><span>Line</span><p>${escapeHtml(row.line_label || "—")}</p></div>
    <div><span>Kategori</span><p>${escapeHtml(row.kategori_frekuensi_label || "—")}</p></div>
    <div><span>Bulan/Tahun</span><p>${escapeHtml(row.bulan_tahun || "—")}</p></div>
    <div><span>Diperiksa OPR</span><p>${escapeHtml(row.checked_by_opr || "—")}</p></div>
    <div><span>Diperiksa SPV</span><p>${escapeHtml(spvChecker(row) || "—")}</p></div>
    <div><span>Review</span><p>${renderReviewBadge(row)}</p></div>
  `;

  const items = row.items || [];
  const fotos = row.lubrication_checklist_foto || [];

  // Kelompokkan foto per titik (dicocokkan lewat item_no yang disimpan
  // saat upload). Foto lama / tanpa item_no ditampilkan terpisah di
  // bawah tabel sebagai "Foto lain".
  const fotoByItemNo = new Map();
  const fotoLain = [];
  for (const f of fotos) {
    if (f.item_no != null && f.item_no !== "") {
      const key = String(f.item_no);
      if (!fotoByItemNo.has(key)) fotoByItemNo.set(key, []);
      fotoByItemNo.get(key).push(f);
    } else {
      fotoLain.push(f);
    }
  }

  detailBody.innerHTML = `
    <div class="table-wrap">
      <table class="pm-detail-table">
        <thead>
          <tr>
            <th>Titik Lubrikasi</th>
            <th>Pelumas / Frekuensi / Metode</th>
            <th>Status</th>
            <th>Status Mesin</th>
            <th>Qty Terpakai</th>
            <th>Keterangan</th>
            <th>Foto</th>
          </tr>
        </thead>
        <tbody>
          ${items
            .map((item) => {
              const itemFotos = fotoByItemNo.get(String(item.no ?? "")) || [];
              return `
            <tr${item.critical ? ' class="lube-row-critical"' : ""}>
              <td>${item.no ?? ""}. ${escapeHtml(item.titik ?? "")}${item.critical ? ` <span class="lube-critical-badge">CRITICAL</span>` : ""}</td>
              <td>${escapeHtml([item.lubricant, item.frekuensi, item.metode].filter(Boolean).join(" · ") || "—")}</td>
              <td>${escapeHtml(item.dilakukan || "—")}</td>
              <td>${renderStopRunBadge(item.statusAktual)}</td>
              <td>${escapeHtml(item.qtyAktual || "—")}</td>
              <td>${escapeHtml(item.keterangan || "—")}</td>
              <td>${renderItemFotoThumbs(itemFotos)}</td>
            </tr>
          `;
            })
            .join("")}
        </tbody>
      </table>
    </div>
  `;

  detailCatatan.innerHTML = row.catatan
    ? `<p><span>Catatan:</span> ${escapeHtml(row.catatan)}</p>`
    : "";

  renderDetailFoto(fotoLain);

  detailOverlay.hidden = false;
}

function renderStopRunBadge(status) {
  if (!status) return "—";
  const cls = status === "Stop" ? "lube-stoprun-badge--stop" : "lube-stoprun-badge--run";
  return `<span class="lube-stoprun-badge ${cls}">${escapeHtml(status)}</span>`;
}

function renderItemFotoThumbs(fotos) {
  if (!fotos || fotos.length === 0) return "—";
  return `
    <div class="lube-item-foto-thumbs">
      ${fotos
        .map(
          (f) => `
        <a href="${f.foto_url}" target="_blank" rel="noopener" title="Buka foto ukuran penuh">
          <img src="${f.foto_url}" alt="Foto titik lubrikasi" loading="lazy" />
        </a>
      `
        )
        .join("")}
    </div>
  `;
}

function renderDetailFoto(fotos) {
  if (!fotos || fotos.length === 0) {
    detailFoto.innerHTML = "";
    return;
  }
  detailFoto.innerHTML = `
    <p class="pm-detail-foto-label">Foto lain (belum terhubung ke titik tertentu) — ${fotos.length}</p>
    <div class="pm-detail-foto-grid">
      ${fotos
        .map(
          (f) => `
        <a href="${f.foto_url}" target="_blank" rel="noopener">
          <img src="${f.foto_url}" alt="Foto evidence checklist" loading="lazy" />
        </a>
      `
        )
        .join("")}
    </div>
  `;
}

function closeDetail() {
  detailOverlay.hidden = true;
}

detailClose.addEventListener("click", closeDetail);
detailOverlay.addEventListener("click", (e) => {
  if (e.target === detailOverlay) closeDetail();
});

// ---------- HELPERS ----------
function formatTanggal(tanggal) {
  if (!tanggal) return "";
  const [y, m, d] = tanggal.split("-");
  return `${d}-${m}-${y}`;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

// ---------- FILTER ----------
btnFilter.addEventListener("click", () => loadSubmissions());

btnReset.addEventListener("click", () => {
  fTanggalDari.value = "";
  fTanggalSampai.value = "";
  fLine.value = "";
  loadSubmissions();
});

// ---------- EXPORT KE EXCEL ----------
btnExport.addEventListener("click", () => {
  if (currentRows.length === 0) return;

  const exportData = currentRows.map((row) => {
    const items = row.items || [];
    const ringkasan = items
      .map((it) => `${it.titik}: ${it.dilakukan || "—"}${it.statusAktual ? ` (Mesin ${it.statusAktual})` : ""}${it.qtyAktual ? ` (${it.qtyAktual})` : ""}${it.keterangan ? ` [${it.keterangan}]` : ""}`)
      .join(" | ");

    return {
      Tanggal: formatTanggal(row.tanggal_inspeksi),
      Line: row.line_label ?? "",
      Kategori: row.kategori_frekuensi_label ?? "",
      "Bulan/Tahun": row.bulan_tahun ?? "",
      "Diperiksa OPR": row.checked_by_opr ?? "",
      "Diperiksa SPV": spvChecker(row),
      "Titik Critical Belum Dilakukan": countCriticalBelum(items),
      Catatan: row.catatan ?? "",
      "Isian Checklist": ringkasan,
      "Link Foto": (row.lubrication_checklist_foto || []).map((f) => f.foto_url).join("; "),
      Review: REVIEW_LABEL[row.review_status] || row.review_status || "",
      "Alasan Ditolak": row.reject_reason ?? "",
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  worksheet["!cols"] = [
    { wch: 11 }, // Tanggal
    { wch: 10 }, // Line
    { wch: 12 }, // Kategori
    { wch: 14 }, // Bulan/Tahun
    { wch: 16 }, // Diperiksa OPR
    { wch: 16 }, // Diperiksa SPV
    { wch: 14 }, // Titik Critical Belum Dilakukan
    { wch: 30 }, // Catatan
    { wch: 80 }, // Isian Checklist
    { wch: 40 }, // Link Foto
    { wch: 16 }, // Review
    { wch: 30 }, // Alasan Ditolak
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Rekap Lubrication");

  const today = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const filename = `rekap-lubrication_${today.getFullYear()}${pad(today.getMonth() + 1)}${pad(today.getDate())}.xlsx`;

  XLSX.writeFile(workbook, filename);
});
