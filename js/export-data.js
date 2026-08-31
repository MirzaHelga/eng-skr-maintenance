import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
import { getSession } from "./auth.js";
import { logAudit } from "./audit.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const REVIEW_LABEL = {
  draft: "Menunggu review",
  approved: "Disetujui",
  rejected: "Ditolak",
};

// ---------- ELEMENTS ----------
const chkLaporan = document.getElementById("f-jenis-laporan");
const chkPm = document.getElementById("f-jenis-pm");
const chkProduction = document.getElementById("f-jenis-production");

const chkDraft = document.getElementById("f-status-draft");
const chkApproved = document.getElementById("f-status-approved");
const chkRejected = document.getElementById("f-status-rejected");

const fDateMode = document.getElementById("f-date-mode");
const fDari = document.getElementById("f-tanggal-dari");
const fSampai = document.getElementById("f-tanggal-sampai");

const btnExport = document.getElementById("btn-export");
const exportError = document.getElementById("export-error");
const exportStatus = document.getElementById("export-status");

// ---------- KONFIGURASI PER JENIS DATA ----------
// dateField = kolom tanggal (date) dipakai kalau mode "kejadian"
// selectFields sama seperti yang dipakai halaman rekap masing-masing,
// ditambah reviewed_at (belum dipakai di rekap, dibutuhkan di sini).
const DATA_TYPES = {
  laporan: {
    label: "Laporan Mesin",
    sheetName: "Laporan Mesin",
    table: "laporan",
    dateField: "tanggal",
    selectFields:
      "tanggal, jam_mulai, jam_selesai, shift, status, deskripsi, pic, review_status, reviewed_by, reviewed_at, reject_reason, area:area_id(nama), mesin:mesin_id(nama), equipment:equipment_id(nama), laporan_foto(foto_url)",
    orderField: "tanggal",
    toRow: (row) => ({
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
      "Direview oleh": row.reviewed_by ?? "",
      "Tanggal Direview": formatTanggalWaktu(row.reviewed_at),
      "Alasan Ditolak": row.reject_reason ?? "",
    }),
    colWidths: [11, 9, 9, 9, 16, 18, 20, 12, 45, 16, 30, 16, 18, 18, 30],
  },
  pm: {
    label: "Checklist PM",
    sheetName: "Checklist PM",
    table: "pm_checklist_submission",
    dateField: "tanggal_inspeksi",
    selectFields:
      "checklist_title, periode_label, equipment, area, bulan_tahun, items, tanggal_inspeksi, checked_by_opr, catatan, review_status, reviewed_by, reviewed_at, reject_reason, pm_checklist_foto(foto_url)",
    orderField: "tanggal_inspeksi",
    toRow: (row) => ({
      Tanggal: formatTanggal(row.tanggal_inspeksi),
      Checklist: row.checklist_title ?? "",
      Periode: row.periode_label ?? "",
      Equipment: row.equipment ?? "",
      Area: row.area ?? "",
      "Bulan/Tahun": row.bulan_tahun ?? "",
      "Diperiksa OPR": row.checked_by_opr ?? "",
      "Diperiksa SPV": row.review_status !== "draft" ? row.reviewed_by || "" : "",
      Catatan: row.catatan ?? "",
      "Isian Checklist": ringkasanItems(row.items),
      "Link Foto": (row.pm_checklist_foto || []).map((f) => f.foto_url).join("; "),
      Review: REVIEW_LABEL[row.review_status] || row.review_status || "",
      "Tanggal Direview": formatTanggalWaktu(row.reviewed_at),
      "Alasan Ditolak": row.reject_reason ?? "",
    }),
    colWidths: [11, 32, 10, 22, 16, 14, 16, 16, 30, 60, 40, 16, 18, 30],
  },
  production: {
    label: "Checklist Production",
    sheetName: "Checklist Production",
    table: "production_checklist_submission",
    dateField: "tanggal_inspeksi",
    selectFields:
      "checklist_title, category_label, periode_label, equipment, area, bulan_tahun, items, tanggal_inspeksi, checked_by_opr, catatan, review_status, reviewed_by, reviewed_at, reject_reason, production_checklist_foto(foto_url)",
    orderField: "tanggal_inspeksi",
    toRow: (row) => ({
      Tanggal: formatTanggal(row.tanggal_inspeksi),
      Checklist: row.checklist_title ?? "",
      Kategori: row.category_label ?? "",
      Periode: row.periode_label ?? "",
      Equipment: row.equipment ?? "",
      Area: row.area ?? "",
      "Bulan/Tahun": row.bulan_tahun ?? "",
      "Diperiksa OPR": row.checked_by_opr ?? "",
      "Diperiksa SPV": row.review_status !== "draft" ? row.reviewed_by || "" : "",
      Catatan: row.catatan ?? "",
      "Isian Checklist": ringkasanItems(row.items),
      "Link Foto": (row.production_checklist_foto || []).map((f) => f.foto_url).join("; "),
      Review: REVIEW_LABEL[row.review_status] || row.review_status || "",
      "Tanggal Direview": formatTanggalWaktu(row.reviewed_at),
      "Alasan Ditolak": row.reject_reason ?? "",
    }),
    colWidths: [11, 32, 18, 10, 22, 16, 14, 16, 16, 30, 60, 40, 16, 18, 30],
  },
};

// ---------- HELPERS ----------
function formatTanggal(tanggal) {
  if (!tanggal) return "";
  const [y, m, d] = tanggal.split("-");
  return `${d}-${m}-${y}`;
}

function formatTanggalWaktu(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function ringkasanItems(itemsRaw) {
  const items = itemsRaw || [];
  const isGrid = items.length > 0 && items[0].values !== undefined;
  return isGrid
    ? items.map((it) => `${it.uraian}: ${Object.values(it.values || {}).filter(Boolean).join("/") || "—"}`).join(" | ")
    : items.map((it) => `${it.uraian}: ${it.hasil || "—"}${it.keterangan ? ` (${it.keterangan})` : ""}`).join(" | ");
}

function selectedTypes() {
  const types = [];
  if (chkLaporan.checked) types.push("laporan");
  if (chkPm.checked) types.push("pm");
  if (chkProduction.checked) types.push("production");
  return types;
}

function selectedStatuses() {
  const statuses = [];
  if (chkDraft.checked) statuses.push("draft");
  if (chkApproved.checked) statuses.push("approved");
  if (chkRejected.checked) statuses.push("rejected");
  return statuses;
}

function showError(msg) {
  exportError.hidden = false;
  exportError.textContent = msg;
}
function clearError() {
  exportError.hidden = true;
  exportError.textContent = "";
}

// Supabase default membatasi 1000 baris per request — ambil per halaman
// sampai habis, biar rentang tanggal yang datanya banyak tetap lengkap.
async function fetchAllRows(cfg, statuses, dateMode, dari, sampai) {
  const pageSize = 1000;
  let from = 0;
  let allRows = [];

  while (true) {
    let query = supabase
      .from(cfg.table)
      .select(cfg.selectFields)
      .order(cfg.orderField, { ascending: true })
      .range(from, from + pageSize - 1);

    if (statuses.length > 0) query = query.in("review_status", statuses);

    if (dateMode === "kejadian") {
      if (dari) query = query.gte(cfg.dateField, dari);
      if (sampai) query = query.lte(cfg.dateField, sampai);
    } else {
      if (dari) query = query.gte("reviewed_at", `${dari}T00:00:00`);
      if (sampai) query = query.lte("reviewed_at", `${sampai}T23:59:59`);
    }

    const { data, error } = await query;
    if (error) throw error;

    allRows = allRows.concat(data || []);
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }

  return allRows;
}

// ---------- EXPORT ----------
btnExport.addEventListener("click", async () => {
  clearError();
  exportStatus.textContent = "";

  const types = selectedTypes();
  if (types.length === 0) {
    showError("Pilih minimal 1 jenis data.");
    return;
  }

  const statuses = selectedStatuses();
  if (statuses.length === 0) {
    showError("Pilih minimal 1 status.");
    return;
  }

  const dateMode = fDateMode.value;
  const dari = fDari.value;
  const sampai = fSampai.value;
  if (dari && sampai && dari > sampai) {
    showError('Tanggal "Dari" tidak boleh lebih besar dari tanggal "Sampai".');
    return;
  }

  btnExport.disabled = true;
  btnExport.textContent = "Mengambil data…";

  try {
    const workbook = XLSX.utils.book_new();
    const summary = [];

    for (const type of types) {
      const cfg = DATA_TYPES[type];
      exportStatus.textContent = `Mengambil data ${cfg.label}…`;

      const rows = await fetchAllRows(cfg, statuses, dateMode, dari, sampai);
      summary.push(`${rows.length} ${cfg.label}`);

      const exportRows = rows.length > 0 ? rows.map(cfg.toRow) : [{}];
      const worksheet = XLSX.utils.json_to_sheet(exportRows);
      worksheet["!cols"] = cfg.colWidths.map((wch) => ({ wch }));
      XLSX.utils.book_append_sheet(workbook, worksheet, cfg.sheetName);
    }

    const today = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const stamp = `${today.getFullYear()}${pad(today.getMonth() + 1)}${pad(today.getDate())}`;
    const filename = `export-data-maintenance_${stamp}.xlsx`;

    XLSX.writeFile(workbook, filename);

    exportStatus.textContent = `Selesai: ${summary.join(", ")}. File "${filename}" sudah kedownload.`;

    const session = getSession();
    const rentang =
      dari || sampai
        ? `${dateMode === "kejadian" ? "Tanggal kejadian" : "Tanggal direview"}: ${dari || "…"} s/d ${sampai || "…"}`
        : "Tanpa filter tanggal";
    logAudit(supabase, {
      actorId: session?.userId,
      actorUsername: session?.username,
      actorNama: session?.nama,
      actorRole: session?.role,
      action: "export_data",
      entityType: types.length === 1 ? types[0] === "pm" ? "pm_checklist" : types[0] === "production" ? "production_checklist" : "laporan" : null,
      entityLabel: types.map((t) => DATA_TYPES[t].label).join(", "),
      detail: `${summary.join(", ")} · ${rentang} · Status: ${statuses.join(", ")}`,
    });
  } catch (err) {
    console.error(err);
    showError("Gagal export: " + err.message);
    exportStatus.textContent = "";
  } finally {
    btnExport.disabled = false;
    btnExport.textContent = "Export ke Excel";
  }
});
