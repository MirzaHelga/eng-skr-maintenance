import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
import { displayName, getSession } from "./auth.js";
import { logAudit } from "./audit.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const tabs = document.getElementById("draft-tabs");
const deptTabs = document.getElementById("draft-dept-tabs");
const draftError = document.getElementById("draft-error");
const draftCount = document.getElementById("draft-count");
const draftList = document.getElementById("draft-list");

const rejectOverlay = document.getElementById("reject-overlay");
const rejectClose = document.getElementById("reject-close");
const rejectTargetLabel = document.getElementById("reject-target-label");
const rejectReason = document.getElementById("reject-reason");
const rejectError = document.getElementById("reject-error");
const rejectConfirm = document.getElementById("reject-confirm");

const detailOverlay = document.getElementById("pm-detail-overlay");
const detailClose = document.getElementById("pm-detail-close");
const detailTitle = document.getElementById("pm-detail-title");
const detailSub = document.getElementById("pm-detail-sub");
const detailMeta = document.getElementById("pm-detail-meta");
const detailBody = document.getElementById("pm-detail-body");
const detailFoto = document.getElementById("pm-detail-foto");
const detailCatatan = document.getElementById("pm-detail-catatan");

let currentStatus = "draft";
let currentDept = "all";
let pendingReject = null; // { tipe, id }

// Jenis data per departemen. Laporan Mesin & Checklist PM masuk
// Utility, sesuai pembagian modul Utility/Production/Lubrication di
// sidebar (lihat PERMISSIONS di js/auth.js).
const DEPT_TIPES = {
  utility: ["laporan", "pm_checklist"],
  production: ["production_checklist"],
  lubrication: ["lubrication_checklist"],
};

// SPV per departemen cuma boleh lihat draft departemennya sendiri —
// HOD Engineering & Superadmin bisa lihat semua & pindah-pindah tab.
const DEPT_RESTRICTED_BY_ROLE = {
  spv_utility: "utility",
  spv_production: "production",
  spv_lubrication: "lubrication",
};

const STATUS_MESIN_CLASS = {
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

function showError(msg) {
  draftError.hidden = false;
  draftError.textContent = msg;
}

function clearError() {
  draftError.hidden = true;
  draftError.textContent = "";
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function formatJamRange(jamMulai, jamSelesai) {
  const mulai = jamMulai ? jamMulai.slice(0, 5) : "";
  const selesai = jamSelesai ? jamSelesai.slice(0, 5) : "";
  if (!mulai && !selesai) return "";
  return `${mulai}–${selesai}`;
}

function formatWaktu(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTanggal(tanggal) {
  if (!tanggal) return "";
  const [y, m, d] = tanggal.split("-");
  return `${d}-${m}-${y}`;
}

// ---------- MUAT DATA ----------
async function loadDrafts() {
  clearError();
  draftCount.textContent = "Memuat data…";
  draftList.innerHTML = `<p class="table-empty">Memuat data…</p>`;

  let laporanQuery = supabase
    .from("laporan")
    .select(
      "id, tanggal, jam_mulai, jam_selesai, shift, status, deskripsi, pic, review_status, reviewed_by, reviewed_at, reject_reason, created_at, area:area_id(nama), mesin:mesin_id(nama), equipment:equipment_id(nama), laporan_foto(foto_url)"
    )
    .order("created_at", { ascending: false });

  let checklistQuery = supabase
    .from("pm_checklist_submission")
    .select(
      "id, checklist_title, periode_label, equipment, area, bulan_tahun, items, tanggal_inspeksi, checked_by_opr, catatan, review_status, reviewed_by, reviewed_at, reject_reason, created_at, pm_checklist_foto(foto_url)"
    )
    .order("created_at", { ascending: false });

  let productionQuery = supabase
    .from("production_checklist_submission")
    .select(
      "id, checklist_title, periode_label, equipment, area, bulan_tahun, items, tanggal_inspeksi, checked_by_opr, catatan, review_status, reviewed_by, reviewed_at, reject_reason, created_at, production_checklist_foto(foto_url)"
    )
    .order("created_at", { ascending: false });

  let lubricationQuery = supabase
    .from("lubrication_checklist_submission")
    .select(
      "id, line_key, line_label, bulan_tahun, items, tanggal_inspeksi, checked_by_opr, catatan, review_status, reviewed_by, reviewed_at, reject_reason, created_at, lubrication_checklist_foto(foto_url)"
    )
    .order("created_at", { ascending: false });

  if (currentStatus) {
    laporanQuery = laporanQuery.eq("review_status", currentStatus);
    checklistQuery = checklistQuery.eq("review_status", currentStatus);
    productionQuery = productionQuery.eq("review_status", currentStatus);
    lubricationQuery = lubricationQuery.eq("review_status", currentStatus);
  }

  const [laporanRes, checklistRes, productionRes, lubricationRes] = await Promise.all([
    laporanQuery,
    checklistQuery,
    productionQuery,
    lubricationQuery,
  ]);

  if (laporanRes.error || checklistRes.error || productionRes.error || lubricationRes.error) {
    console.error(laporanRes.error || checklistRes.error || productionRes.error || lubricationRes.error);
    showError(
      "Gagal memuat data draft. Pastikan sql/08_add_draft_workflow.sql, sql/11_add_production_checklist.sql, dan sql/15_add_lubrication_draft_workflow.sql sudah dijalankan di Supabase. (" +
        ((laporanRes.error || checklistRes.error || productionRes.error || lubricationRes.error).message || "unknown error") +
        ")"
    );
    draftCount.textContent = "";
    draftList.innerHTML = "";
    return;
  }

  let items = [
    ...(laporanRes.data || []).map((row) => ({ tipe: "laporan", row })),
    ...(checklistRes.data || []).map((row) => ({ tipe: "pm_checklist", row })),
    ...(productionRes.data || []).map((row) => ({ tipe: "production_checklist", row })),
    ...(lubricationRes.data || []).map((row) => ({ tipe: "lubrication_checklist", row })),
  ].sort((a, b) => new Date(b.row.created_at) - new Date(a.row.created_at));

  if (currentDept !== "all") {
    const allowedTipes = DEPT_TIPES[currentDept] || [];
    items = items.filter((item) => allowedTipes.includes(item.tipe));
  }

  draftCount.textContent = `${items.length} data ditemukan`;
  renderList(items);
}

function renderList(items) {
  if (items.length === 0) {
    draftList.innerHTML = `<p class="table-empty">Tidak ada data untuk tab ini.</p>`;
    return;
  }

  draftList.innerHTML = "";
  for (const item of items) {
    let cardEl;
    if (item.tipe === "laporan") cardEl = renderLaporanCard(item.row);
    else if (item.tipe === "production_checklist") cardEl = renderProductionCard(item.row);
    else if (item.tipe === "lubrication_checklist") cardEl = renderLubricationCard(item.row);
    else cardEl = renderChecklistCard(item.row);
    draftList.appendChild(cardEl);
  }
}

function reviewBadge(row) {
  return `<span class="review-badge review-badge--${row.review_status}">${REVIEW_LABEL[row.review_status] || row.review_status}</span>`;
}

function reviewFooter(row) {
  if (row.review_status === "draft") return "";
  const who = row.reviewed_by ? escapeHtml(row.reviewed_by) : "";
  const when = formatWaktu(row.reviewed_at);
  let text = `${row.review_status === "approved" ? "Disetujui" : "Ditolak"} oleh ${who} · ${when}`;
  if (row.review_status === "rejected" && row.reject_reason) {
    text += `<br><span class="draft-reject-reason">Alasan: ${escapeHtml(row.reject_reason)}</span>`;
  }
  return `<p class="draft-review-footer">${text}</p>`;
}

function entityLabelFor(tipe, row) {
  if (tipe === "laporan") return row.equipment?.nama || row.mesin?.nama || "Laporan";
  if (tipe === "lubrication_checklist") return `Lubrication — ${row.line_label || "-"}`;
  return row.checklist_title || "Checklist";
}

function actionButtons(tipe, row) {
  const detailBtn = `<button type="button" class="btn-link-btn pm-detail-btn" data-tipe="${tipe}" data-id="${row.id}">Lihat detail</button>`;

  if (row.review_status !== "draft") {
    return `<div class="draft-actions">${detailBtn}</div>`;
  }

  const label = escapeHtml(entityLabelFor(tipe, row));

  return `
    <div class="draft-actions">
      ${detailBtn}
      <button type="button" class="btn-approve" data-tipe="${tipe}" data-id="${row.id}" data-label="${label}">Approve</button>
      <button type="button" class="btn-reject" data-tipe="${tipe}" data-id="${row.id}" data-label="${label}">Reject</button>
    </div>
  `;
}

function renderLaporanCard(row) {
  const card = document.createElement("div");
  card.className = "draft-card";
  const statusClass = STATUS_MESIN_CLASS[row.status] || "";
  const jam = formatJamRange(row.jam_mulai, row.jam_selesai);
  card.innerHTML = `
    <div class="draft-card-head">
      <span class="draft-type-badge draft-type-badge--laporan">Laporan Mesin</span>
      ${reviewBadge(row)}
    </div>
    <p class="draft-card-title">${escapeHtml(row.equipment?.nama || row.mesin?.nama || "-")}</p>
    <p class="draft-card-meta">${escapeHtml(row.area?.nama || "")} · ${row.tanggal || ""} ${jam} · ${row.shift || ""}</p>
    <span class="status-badge status-${statusClass}">${row.status || ""}</span>
    <p class="draft-card-desc">${escapeHtml(row.deskripsi || "")}</p>
    <p class="draft-card-pic">PIC: ${escapeHtml(row.pic || "-")}</p>
    ${reviewFooter(row)}
    ${actionButtons("laporan", row)}
  `;
  bindActions(card, row);
  return card;
}

function renderChecklistCard(row) {
  const card = document.createElement("div");
  card.className = "draft-card";
  card.innerHTML = `
    <div class="draft-card-head">
      <span class="draft-type-badge draft-type-badge--checklist">Checklist PM</span>
      ${reviewBadge(row)}
    </div>
    <p class="draft-card-title">${escapeHtml(row.checklist_title || "-")}</p>
    <p class="draft-card-meta">${escapeHtml(row.equipment || "")} · ${escapeHtml(row.area || "")} · ${escapeHtml(
    row.periode_label || ""
  )} · ${row.tanggal_inspeksi || ""}</p>
    <p class="draft-card-pic">Diperiksa OPR: ${escapeHtml(row.checked_by_opr || "-")}</p>
    ${reviewFooter(row)}
    ${actionButtons("pm_checklist", row)}
  `;
  bindActions(card, row);
  return card;
}

function renderProductionCard(row) {
  const card = document.createElement("div");
  card.className = "draft-card";
  card.innerHTML = `
    <div class="draft-card-head">
      <span class="draft-type-badge draft-type-badge--checklist">Production</span>
      ${reviewBadge(row)}
    </div>
    <p class="draft-card-title">${escapeHtml(row.checklist_title || "-")}</p>
    <p class="draft-card-meta">${escapeHtml(row.equipment || "")} · ${escapeHtml(row.area || "")} · ${escapeHtml(
    row.periode_label || ""
  )} · ${row.tanggal_inspeksi || ""}</p>
    <p class="draft-card-pic">Diperiksa OPR: ${escapeHtml(row.checked_by_opr || "-")}</p>
    ${reviewFooter(row)}
    ${actionButtons("production_checklist", row)}
  `;
  bindActions(card, row);
  return card;
}

function countCriticalBelum(items) {
  return (items || []).filter((it) => it.critical && it.dilakukan === "Belum").length;
}

function renderLubricationCard(row) {
  const card = document.createElement("div");
  card.className = "draft-card";
  const critBelum = countCriticalBelum(row.items);
  card.innerHTML = `
    <div class="draft-card-head">
      <span class="draft-type-badge draft-type-badge--checklist">Lubrication</span>
      ${reviewBadge(row)}
    </div>
    <p class="draft-card-title">${escapeHtml(row.line_label || "-")}</p>
    <p class="draft-card-meta">${escapeHtml(row.bulan_tahun || "")} · ${row.tanggal_inspeksi || ""}${
    critBelum > 0 ? ` · <span class="lube-critical-badge">${critBelum} critical belum</span>` : ""
  }</p>
    <p class="draft-card-pic">Diperiksa OPR: ${escapeHtml(row.checked_by_opr || "-")}</p>
    ${reviewFooter(row)}
    ${actionButtons("lubrication_checklist", row)}
  `;
  bindActions(card, row);
  return card;
}

function bindActions(card, row) {
  card.querySelectorAll(".pm-detail-btn").forEach((btn) => {
    btn.addEventListener("click", () => openDetail(btn.dataset.tipe, row));
  });
  card.querySelectorAll(".btn-approve").forEach((btn) => {
    btn.addEventListener("click", () => approveItem(btn.dataset.tipe, btn.dataset.id, btn.dataset.label));
  });
  card.querySelectorAll(".btn-reject").forEach((btn) => {
    btn.addEventListener("click", () => openRejectModal(btn.dataset.tipe, btn.dataset.id, btn.dataset.label));
  });
}

const TABLE_BY_TIPE = {
  laporan: "laporan",
  pm_checklist: "pm_checklist_submission",
  production_checklist: "production_checklist_submission",
  lubrication_checklist: "lubrication_checklist_submission",
};

async function approveItem(tipe, id, label) {
  const { error } = await supabase
    .from(TABLE_BY_TIPE[tipe])
    .update({
      review_status: "approved",
      reviewed_by: displayName(),
      reviewed_at: new Date().toISOString(),
      reject_reason: null,
    })
    .eq("id", id);

  if (error) {
    console.error(error);
    showError("Gagal approve data. (" + (error.message || "unknown error") + ")");
    return;
  }

  const session = getSession();
  logAudit(supabase, {
    actorId: session?.userId,
    actorUsername: session?.username,
    actorNama: session?.nama,
    actorRole: session?.role,
    action: "approve",
    entityType: tipe,
    entityId: id,
    entityLabel: label,
  });

  loadDrafts();
}

function openRejectModal(tipe, id, label) {
  pendingReject = { tipe, id, label };
  rejectTargetLabel.textContent = label || "";
  rejectReason.value = "";
  rejectError.hidden = true;
  rejectOverlay.hidden = false;
}

function closeRejectModal() {
  rejectOverlay.hidden = true;
  pendingReject = null;
}

rejectClose.addEventListener("click", closeRejectModal);
rejectOverlay.addEventListener("click", (e) => {
  if (e.target === rejectOverlay) closeRejectModal();
});

rejectConfirm.addEventListener("click", async () => {
  if (!pendingReject) return;
  const reason = rejectReason.value.trim();
  if (!reason) {
    rejectError.hidden = false;
    return;
  }

  const { tipe, id } = pendingReject;
  const { error } = await supabase
    .from(TABLE_BY_TIPE[tipe])
    .update({
      review_status: "rejected",
      reviewed_by: displayName(),
      reviewed_at: new Date().toISOString(),
      reject_reason: reason,
    })
    .eq("id", id);

  if (error) {
    console.error(error);
    showError("Gagal menolak data. (" + (error.message || "unknown error") + ")");
    return;
  }

  const session = getSession();
  logAudit(supabase, {
    actorId: session?.userId,
    actorUsername: session?.username,
    actorNama: session?.nama,
    actorRole: session?.role,
    action: "reject",
    entityType: tipe,
    entityId: id,
    entityLabel: pendingReject.label,
    detail: reason,
  });

  closeRejectModal();
  loadDrafts();
});

// ---------- MODAL LIHAT DETAIL ----------
function openDetail(tipe, row) {
  if (tipe === "laporan") openDetailLaporan(row);
  else if (tipe === "lubrication_checklist") openDetailLubrication(row);
  else openDetailChecklist(tipe, row);
}

function openDetailLaporan(row) {
  const jam = formatJamRange(row.jam_mulai, row.jam_selesai);
  detailTitle.textContent = row.equipment?.nama || row.mesin?.nama || "Laporan Mesin";
  detailSub.textContent = `${formatTanggal(row.tanggal)} ${jam} · ${row.shift || ""}`;

  detailMeta.innerHTML = `
    <div><span>Area</span><p>${escapeHtml(row.area?.nama || "—")}</p></div>
    <div><span>Mesin</span><p>${escapeHtml(row.mesin?.nama || "—")}</p></div>
    <div><span>Equipment</span><p>${escapeHtml(row.equipment?.nama || "—")}</p></div>
    <div><span>Status mesin</span><p>${escapeHtml(row.status || "—")}</p></div>
    <div><span>PIC</span><p>${escapeHtml(row.pic || "—")}</p></div>
    <div><span>Review</span><p>${reviewBadge(row)}</p></div>
  `;

  detailBody.innerHTML = `
    <p class="pm-detail-uraian">${escapeHtml(row.deskripsi || "Tidak ada deskripsi.")}</p>
  `;

  detailCatatan.innerHTML = "";

  renderDetailFoto(row.laporan_foto);

  detailOverlay.hidden = false;
}

function openDetailChecklist(tipe, row) {
  const fotoField = tipe === "production_checklist" ? row.production_checklist_foto : row.pm_checklist_foto;

  detailTitle.textContent = row.checklist_title ?? "";
  detailSub.textContent = `${row.periode_label ?? ""} · ${formatTanggal(row.tanggal_inspeksi)}`;

  detailMeta.innerHTML = `
    <div><span>Equipment</span><p>${escapeHtml(row.equipment || "—")}</p></div>
    <div><span>Area</span><p>${escapeHtml(row.area || "—")}</p></div>
    <div><span>Bulan/Tahun</span><p>${escapeHtml(row.bulan_tahun || "—")}</p></div>
    <div><span>Diperiksa OPR</span><p>${escapeHtml(row.checked_by_opr || "—")}</p></div>
    <div><span>Diperiksa SPV</span><p>${escapeHtml(row.review_status !== "draft" ? row.reviewed_by || "—" : "—")}</p></div>
    <div><span>Review</span><p>${reviewBadge(row)}</p></div>
  `;

  const items = row.items || [];
  const isGrid = items.length > 0 && items[0].values !== undefined;

  if (isGrid) {
    const columns = Object.keys(items[0].values || {});
    detailBody.innerHTML = `
      <div class="table-wrap">
        <table class="pm-detail-table">
          <thead>
            <tr>
              <th>Uraian</th>
              ${columns.map((c) => `<th>${escapeHtml(c)}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${items
              .map(
                (item) => `
              <tr>
                <td>
                  <p class="pm-detail-uraian">${item.no ?? ""}. ${escapeHtml(item.uraian ?? "")}</p>
                  ${item.standar ? `<p class="pm-detail-standar">Standar: ${escapeHtml(item.standar)}</p>` : ""}
                </td>
                ${columns.map((c) => `<td>${escapeHtml((item.values && item.values[c]) || "—")}</td>`).join("")}
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;
  } else {
    detailBody.innerHTML = `
      <div class="table-wrap">
        <table class="pm-detail-table">
          <thead>
            <tr>
              <th>Uraian</th>
              <th>Standar</th>
              <th>Hasil</th>
              <th>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            ${items
              .map(
                (item) => `
              <tr>
                <td>${item.no ?? ""}. ${escapeHtml(item.uraian ?? "")}</td>
                <td>${escapeHtml(item.standar || "—")}</td>
                <td>${escapeHtml(item.hasil || "—")}</td>
                <td>${escapeHtml(item.keterangan || "—")}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  detailCatatan.innerHTML = row.catatan
    ? `<p><span>Catatan:</span> ${escapeHtml(row.catatan)}</p>`
    : "";

  renderDetailFoto(fotoField);

  detailOverlay.hidden = false;
}

function openDetailLubrication(row) {
  detailTitle.textContent = `Lubrication — ${row.line_label ?? ""}`;
  detailSub.textContent = `${formatTanggal(row.tanggal_inspeksi)}${row.bulan_tahun ? ` · ${row.bulan_tahun}` : ""}`;

  detailMeta.innerHTML = `
    <div><span>Line</span><p>${escapeHtml(row.line_label || "—")}</p></div>
    <div><span>Bulan/Tahun</span><p>${escapeHtml(row.bulan_tahun || "—")}</p></div>
    <div><span>Diperiksa OPR</span><p>${escapeHtml(row.checked_by_opr || "—")}</p></div>
    <div><span>Diperiksa SPV</span><p>${escapeHtml(row.review_status !== "draft" ? row.reviewed_by || "—" : "—")}</p></div>
    <div><span>Review</span><p>${reviewBadge(row)}</p></div>
  `;

  const items = row.items || [];
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
          </tr>
        </thead>
        <tbody>
          ${items
            .map(
              (item) => `
            <tr${item.critical ? ' class="lube-row-critical"' : ""}>
              <td>${item.no ?? ""}. ${escapeHtml(item.titik ?? "")}${item.critical ? ` <span class="lube-critical-badge">CRITICAL</span>` : ""}</td>
              <td>${escapeHtml([item.lubricant, item.frekuensi, item.metode].filter(Boolean).join(" · ") || "—")}</td>
              <td>${escapeHtml(item.dilakukan || "—")}</td>
              <td>${item.statusAktual ? `<span class="lube-stoprun-badge ${item.statusAktual === "Stop" ? "lube-stoprun-badge--stop" : "lube-stoprun-badge--run"}">${escapeHtml(item.statusAktual)}</span>` : "—"}</td>
              <td>${escapeHtml(item.qtyAktual || "—")}</td>
              <td>${escapeHtml(item.keterangan || "—")}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;

  detailCatatan.innerHTML = row.catatan
    ? `<p><span>Catatan:</span> ${escapeHtml(row.catatan)}</p>`
    : "";

  renderDetailFoto(row.lubrication_checklist_foto);

  detailOverlay.hidden = false;
}

function renderDetailFoto(fotos) {
  if (!fotos || fotos.length === 0) {
    detailFoto.innerHTML = "";
    return;
  }
  detailFoto.innerHTML = `
    <p class="pm-detail-foto-label">Foto evidence (${fotos.length})</p>
    <div class="pm-detail-foto-grid">
      ${fotos
        .map(
          (f) => `
        <a href="${f.foto_url}" target="_blank" rel="noopener">
          <img src="${f.foto_url}" alt="Foto evidence" loading="lazy" />
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

// ---------- TABS ----------
tabs.addEventListener("click", (e) => {
  const tab = e.target.closest(".draft-tab");
  if (!tab) return;
  tabs.querySelectorAll(".draft-tab").forEach((t) => t.classList.remove("active"));
  tab.classList.add("active");
  currentStatus = tab.dataset.status;
  loadDrafts();
});

deptTabs.addEventListener("click", (e) => {
  const tab = e.target.closest(".draft-tab");
  if (!tab) return;
  deptTabs.querySelectorAll(".draft-tab").forEach((t) => t.classList.remove("active"));
  tab.classList.add("active");
  currentDept = tab.dataset.dept;
  loadDrafts();
});

// SPV per departemen (Utility/Production/Lubrication) cuma boleh lihat
// draft departemennya sendiri — tab "Semua Departemen" & tab
// departemen lain disembunyikan, dan tab departemennya langsung aktif.
// HOD Engineering & Superadmin tetap lihat & bisa pindah ke semua tab.
function restrictDeptTabsByRole() {
  const role = getSession()?.role;
  const restrictedDept = DEPT_RESTRICTED_BY_ROLE[role];
  if (!restrictedDept) return;

  deptTabs.querySelectorAll(".draft-tab").forEach((t) => {
    const isOwn = t.dataset.dept === restrictedDept;
    t.hidden = !isOwn;
    t.classList.toggle("active", isOwn);
  });
  currentDept = restrictedDept;
}

// Buka halaman Draft = notifikasi yang menunggu dianggap sudah dilihat.
async function markAllNotificationsRead() {
  const { error } = await supabase.from("notifikasi").update({ dibaca: true }).eq("dibaca", false);
  if (error) console.error("Gagal menandai notifikasi terbaca:", error);
}

restrictDeptTabsByRole();
loadDrafts();
markAllNotificationsRead();
