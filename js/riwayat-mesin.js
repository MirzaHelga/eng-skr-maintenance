import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---------- ELEMENTS ----------
const selectArea = document.getElementById("rw-select-area");
const selectMesin = document.getElementById("rw-select-mesin");
const selectEquipment = document.getElementById("rw-select-equipment");
const inputDari = document.getElementById("rw-tanggal-dari");
const inputSampai = document.getElementById("rw-tanggal-sampai");
const btnTampilkan = document.getElementById("btn-tampilkan");
const btnReset = document.getElementById("btn-reset");
const rwError = document.getElementById("rw-error");
const rwPlaceholder = document.getElementById("rw-placeholder");
const rwResult = document.getElementById("rw-result");

const equipmentNameEl = document.getElementById("rw-equipment-name");
const equipmentMetaEl = document.getElementById("rw-equipment-meta");
const btnLapor = document.getElementById("rw-btn-lapor");

const statTotal = document.getElementById("rw-stat-total");
const statBreakdown = document.getElementById("rw-stat-breakdown");
const statMaintenance = document.getElementById("rw-stat-maintenance");
const statRunning = document.getElementById("rw-stat-running");
const statLast = document.getElementById("rw-stat-last");
const statChecklist = document.getElementById("rw-stat-checklist");

const timelineEl = document.getElementById("rw-timeline");

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

let areas = [];
let mesinList = [];
let equipmentList = [];

function showError(msg) {
  rwError.textContent = msg;
  rwError.hidden = false;
}
function clearError() {
  rwError.hidden = true;
  rwError.textContent = "";
}

function fillSelect(selectEl, items, placeholder) {
  selectEl.innerHTML = "";
  const opt0 = document.createElement("option");
  opt0.value = "";
  opt0.textContent = placeholder;
  opt0.disabled = true;
  opt0.selected = true;
  selectEl.appendChild(opt0);
  for (const item of items) {
    const opt = document.createElement("option");
    opt.value = item.id;
    opt.textContent = item.nama;
    selectEl.appendChild(opt);
  }
}

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

// ---------- MASTER DATA ----------
async function loadMasterData() {
  const [areaRes, mesinRes, equipmentRes] = await Promise.all([
    supabase.from("area").select("id, nama").order("nama"),
    supabase.from("mesin").select("id, area_id, nama").order("nama"),
    supabase.from("equipment").select("id, mesin_id, nama").order("nama"),
  ]);

  if (areaRes.error || mesinRes.error || equipmentRes.error) {
    console.error(areaRes.error || mesinRes.error || equipmentRes.error);
    showError("Gagal memuat data area/mesin/equipment. Cek koneksi atau konfigurasi Supabase.");
    return;
  }

  areas = areaRes.data || [];
  mesinList = mesinRes.data || [];
  equipmentList = equipmentRes.data || [];

  fillSelect(selectArea, areas, "Pilih area");
  selectArea.disabled = false;
}

selectArea.addEventListener("change", () => {
  const filtered = mesinList.filter((m) => m.area_id === selectArea.value);
  fillSelect(selectMesin, filtered, "Pilih mesin");
  selectMesin.disabled = false;
  fillSelect(selectEquipment, [], "Pilih mesin dulu");
  selectEquipment.disabled = true;
  btnTampilkan.disabled = true;
});

selectMesin.addEventListener("change", () => {
  const filtered = equipmentList.filter((e) => e.mesin_id === selectMesin.value);
  fillSelect(selectEquipment, filtered, "Pilih equipment");
  selectEquipment.disabled = false;
  btnTampilkan.disabled = true;
});

selectEquipment.addEventListener("change", () => {
  btnTampilkan.disabled = !selectEquipment.value;
});

// ---------- LOAD RIWAYAT ----------
async function loadRiwayat() {
  const equipmentId = selectEquipment.value;
  if (!equipmentId) return;

  const equipment = equipmentList.find((e) => e.id === equipmentId);
  const equipmentNama = equipment?.nama || "";

  clearError();
  rwPlaceholder.hidden = true;
  rwResult.hidden = true;
  timelineEl.innerHTML = `<p class="table-empty">Memuat riwayat…</p>`;

  let laporanQuery = supabase
    .from("laporan")
    .select(
      "id, tanggal, jam_mulai, jam_selesai, shift, status, deskripsi, pic, review_status, reviewed_by, reject_reason, laporan_foto(foto_url)"
    )
    .eq("equipment_id", equipmentId)
    .order("tanggal", { ascending: false })
    .order("jam_mulai", { ascending: false });

  // PM Checklist & Production TIDAK punya relasi equipment_id (field
  // "equipment"-nya isian bebas) — dicocokkan otomatis dengan ILIKE
  // terhadap nama equipment yang dipilih. Bisa saja ada yang meleset
  // kalau operator ngetiknya beda dari nama master data.
  let pmQuery = supabase
    .from("pm_checklist_submission")
    .select(
      "id, checklist_title, periode_label, equipment, area, bulan_tahun, tanggal_inspeksi, checked_by_opr, review_status, reviewed_by, reject_reason, pm_checklist_foto(foto_url)"
    )
    .ilike("equipment", `%${equipmentNama}%`)
    .order("tanggal_inspeksi", { ascending: false });

  let productionQuery = supabase
    .from("production_checklist_submission")
    .select(
      "id, checklist_title, periode_label, equipment, area, bulan_tahun, tanggal_inspeksi, checked_by_opr, review_status, reviewed_by, reject_reason, production_checklist_foto(foto_url)"
    )
    .ilike("equipment", `%${equipmentNama}%`)
    .order("tanggal_inspeksi", { ascending: false });

  if (inputDari.value) {
    laporanQuery = laporanQuery.gte("tanggal", inputDari.value);
    pmQuery = pmQuery.gte("tanggal_inspeksi", inputDari.value);
    productionQuery = productionQuery.gte("tanggal_inspeksi", inputDari.value);
  }
  if (inputSampai.value) {
    laporanQuery = laporanQuery.lte("tanggal", inputSampai.value);
    pmQuery = pmQuery.lte("tanggal_inspeksi", inputSampai.value);
    productionQuery = productionQuery.lte("tanggal_inspeksi", inputSampai.value);
  }

  const [laporanRes, pmRes, productionRes] = await Promise.all([laporanQuery, pmQuery, productionQuery]);

  if (laporanRes.error || pmRes.error || productionRes.error) {
    console.error(laporanRes.error || pmRes.error || productionRes.error);
    showError(
      "Gagal memuat riwayat. Pastikan policy baca tabel laporan/pm_checklist_submission/production_checklist_submission sudah dijalankan. (" +
        (laporanRes.error || pmRes.error || productionRes.error).message +
        ")"
    );
    rwResult.hidden = true;
    rwPlaceholder.hidden = false;
    return;
  }

  const laporanRows = laporanRes.data || [];
  const items = [
    ...laporanRows.map((row) => ({ tipe: "laporan", tanggal: row.tanggal, row })),
    ...(pmRes.data || []).map((row) => ({ tipe: "pm_checklist", tanggal: row.tanggal_inspeksi, row })),
    ...(productionRes.data || []).map((row) => ({ tipe: "production_checklist", tanggal: row.tanggal_inspeksi, row })),
  ].sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

  renderHeader(equipmentId);
  renderStats(laporanRows, items.length - laporanRows.length);
  renderTimeline(items);
  rwResult.hidden = false;
}

function renderHeader(equipmentId) {
  const equipment = equipmentList.find((e) => e.id === equipmentId);
  const mesin = equipment ? mesinList.find((m) => m.id === equipment.mesin_id) : null;
  const area = mesin ? areas.find((a) => a.id === mesin.area_id) : null;

  equipmentNameEl.textContent = equipment?.nama || "-";
  equipmentMetaEl.textContent = `${mesin?.nama || "-"} · ${area?.nama || "-"}`;
  btnLapor.href = `laporan.html?equipment=${equipmentId}`;
}

function renderStats(laporanRows, checklistCount) {
  const counts = { Running: 0, Standby: 0, Maintenance: 0, Breakdown: 0 };
  for (const row of laporanRows) {
    if (row.status in counts) counts[row.status]++;
  }
  statTotal.textContent = String(laporanRows.length);
  statBreakdown.textContent = String(counts.Breakdown);
  statMaintenance.textContent = String(counts.Maintenance);
  statRunning.textContent = String(counts.Running);
  statChecklist.textContent = String(checklistCount);

  if (laporanRows.length > 0) {
    const last = laporanRows[0]; // sudah urut terbaru dulu
    statLast.textContent = `${last.status} — ${formatTanggal(last.tanggal)}`;
  } else {
    statLast.textContent = "Belum ada laporan";
  }
}

function renderTimeline(items) {
  if (items.length === 0) {
    timelineEl.innerHTML = `<p class="table-empty">Belum ada riwayat untuk equipment ini pada rentang yang dipilih.</p>`;
    return;
  }

  timelineEl.innerHTML = items
    .map((item) => {
      if (item.tipe === "laporan") return timelineItemLaporan(item.row);
      return timelineItemChecklist(item.tipe, item.row);
    })
    .join("");
}

function timelineItemLaporan(row) {
  const statusClass = STATUS_CLASS[row.status] || "";
  const jamMulai = row.jam_mulai ? row.jam_mulai.slice(0, 5) : "";
  const jamSelesai = row.jam_selesai ? row.jam_selesai.slice(0, 5) : "";
  const jam = jamMulai || jamSelesai ? `${jamMulai}–${jamSelesai}` : "";
  const reviewLabel = REVIEW_LABEL[row.review_status] || row.review_status || "";
  const reviewClass = row.review_status === "approved" ? "badge-approved" : row.review_status === "rejected" ? "badge-rejected" : "";
  const fotos = row.laporan_foto || [];

  const fotoHtml = fotos.length
    ? `<div class="rw-photo-row">${fotos
        .map(
          (f) =>
            `<a href="${escapeHtml(f.foto_url)}" target="_blank" rel="noopener"><img src="${escapeHtml(f.foto_url)}" alt="Foto laporan" class="rw-photo-thumb" /></a>`
        )
        .join("")}</div>`
    : "";

  const rejectHtml = row.review_status === "rejected" && row.reject_reason
    ? `<p class="rw-timeline-reject">Alasan ditolak: ${escapeHtml(row.reject_reason)}</p>`
    : "";

  return `
    <div class="rw-timeline-item">
      <div class="rw-timeline-dot rw-timeline-dot--${statusClass}"></div>
      <div class="rw-timeline-content">
        <div class="rw-timeline-head">
          <span class="draft-type-badge draft-type-badge--laporan">Laporan Mesin</span>
          <span class="status-badge status-${statusClass}">${escapeHtml(row.status)}</span>
          <span class="rw-timeline-date">${formatTanggal(row.tanggal)} · ${escapeHtml(row.shift || "")} · ${jam}</span>
          ${reviewClass ? `<span class="badge-status ${reviewClass}">${reviewLabel}</span>` : `<span class="rw-timeline-draft">${reviewLabel}</span>`}
        </div>
        <p class="rw-timeline-desc">${escapeHtml(row.deskripsi)}</p>
        <p class="rw-timeline-pic">PIC: ${escapeHtml(row.pic || "-")}</p>
        ${rejectHtml}
        ${fotoHtml}
      </div>
    </div>
  `;
}

const CHECKLIST_TYPE_LABEL = {
  pm_checklist: "PM Checklist",
  production_checklist: "Production Checklist",
};

function timelineItemChecklist(tipe, row) {
  const fotoField = tipe === "production_checklist" ? row.production_checklist_foto : row.pm_checklist_foto;
  const fotos = fotoField || [];
  const reviewLabel = REVIEW_LABEL[row.review_status] || row.review_status || "";
  const reviewClass = row.review_status === "approved" ? "badge-approved" : row.review_status === "rejected" ? "badge-rejected" : "";

  const fotoHtml = fotos.length
    ? `<div class="rw-photo-row">${fotos
        .map(
          (f) =>
            `<a href="${escapeHtml(f.foto_url)}" target="_blank" rel="noopener"><img src="${escapeHtml(f.foto_url)}" alt="Foto checklist" class="rw-photo-thumb" /></a>`
        )
        .join("")}</div>`
    : "";

  const rejectHtml = row.review_status === "rejected" && row.reject_reason
    ? `<p class="rw-timeline-reject">Alasan ditolak: ${escapeHtml(row.reject_reason)}</p>`
    : "";

  return `
    <div class="rw-timeline-item">
      <div class="rw-timeline-dot rw-timeline-dot--checklist"></div>
      <div class="rw-timeline-content">
        <div class="rw-timeline-head">
          <span class="draft-type-badge draft-type-badge--checklist">${CHECKLIST_TYPE_LABEL[tipe]}</span>
          <span class="rw-timeline-date">${formatTanggal(row.tanggal_inspeksi)} · ${escapeHtml(row.periode_label || "")}</span>
          ${reviewClass ? `<span class="badge-status ${reviewClass}">${reviewLabel}</span>` : `<span class="rw-timeline-draft">${reviewLabel}</span>`}
        </div>
        <p class="rw-timeline-desc">${escapeHtml(row.checklist_title || "")}</p>
        <p class="rw-timeline-pic">Equipment (isian OPR): ${escapeHtml(row.equipment || "-")}${row.area ? ` · ${escapeHtml(row.area)}` : ""}</p>
        <p class="rw-timeline-pic">Diperiksa OPR: ${escapeHtml(row.checked_by_opr || "-")}</p>
        ${rejectHtml}
        ${fotoHtml}
      </div>
    </div>
  `;
}

// ---------- ACTIONS ----------
btnTampilkan.addEventListener("click", loadRiwayat);

btnReset.addEventListener("click", () => {
  fillSelect(selectArea, areas, "Pilih area");
  fillSelect(selectMesin, [], "Pilih area dulu");
  selectMesin.disabled = true;
  fillSelect(selectEquipment, [], "Pilih mesin dulu");
  selectEquipment.disabled = true;
  inputDari.value = "";
  inputSampai.value = "";
  btnTampilkan.disabled = true;
  clearError();
  rwResult.hidden = true;
  rwPlaceholder.hidden = false;
});

// ---------- DEEP LINK: ?equipment=<id> (mis. dari QR / link lain) ----------
async function applyDeepLink() {
  const params = new URLSearchParams(window.location.search);
  const equipmentId = params.get("equipment");
  if (!equipmentId) return;

  const equipment = equipmentList.find((e) => e.id === equipmentId);
  if (!equipment) return;
  const mesin = mesinList.find((m) => m.id === equipment.mesin_id);
  if (!mesin) return;

  selectArea.value = mesin.area_id;
  selectArea.dispatchEvent(new Event("change"));
  selectMesin.value = mesin.id;
  selectMesin.dispatchEvent(new Event("change"));
  selectEquipment.value = equipment.id;
  btnTampilkan.disabled = false;
  await loadRiwayat();
}

// ---------- INIT ----------
async function init() {
  await loadMasterData();
  await applyDeepLink();
}

init();
