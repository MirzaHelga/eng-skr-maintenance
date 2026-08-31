import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
import { getSession } from "./auth.js";
import { logAuditBulk } from "./audit.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Konfigurasi per jenis data. Semua tiga jenis polanya sama: 1 tabel
// utama + 1 tabel foto terpisah (relasi on delete cascade) + 1 bucket
// storage buat file fisiknya.
const DATA_TYPES = {
  laporan: {
    table: "laporan",
    fotoTable: "laporan_foto",
    bucket: "foto-laporan",
    selectFields:
      "id, tanggal, status, pic, reviewed_at, reviewed_by, area:area_id(nama), mesin:mesin_id(nama), equipment:equipment_id(nama), laporan_foto(foto_url)",
    getFotos: (row) => row.laporan_foto || [],
    renderDetail: (row) =>
      `${row.area?.nama ?? "-"} / ${row.mesin?.nama ?? "-"} / ${row.equipment?.nama ?? "-"} (${row.status})`,
  },
  pm: {
    table: "pm_checklist_submission",
    fotoTable: "pm_checklist_foto",
    bucket: "foto-checklist-pm",
    selectFields:
      "id, checklist_title, periode_label, equipment, area, tanggal_inspeksi, reviewed_at, reviewed_by, pm_checklist_foto(foto_url)",
    getFotos: (row) => row.pm_checklist_foto || [],
    renderDetail: (row) => `${row.checklist_title} — ${row.equipment} / ${row.area} (${row.periode_label})`,
  },
  production: {
    table: "production_checklist_submission",
    fotoTable: "production_checklist_foto",
    bucket: "foto-production-checklist",
    selectFields:
      "id, checklist_title, periode_label, equipment, area, tanggal_inspeksi, reviewed_at, reviewed_by, production_checklist_foto(foto_url)",
    getFotos: (row) => row.production_checklist_foto || [],
    renderDetail: (row) => `${row.checklist_title} — ${row.equipment} / ${row.area} (${row.periode_label})`,
  },
};

// ---------- ELEMENTS ----------
const fJenis = document.getElementById("f-jenis");
const fStatus = document.getElementById("f-status");
const fSebelum = document.getElementById("f-sebelum");
const btnCari = document.getElementById("btn-cari");
const hasilCount = document.getElementById("hasil-count");
const hasilError = document.getElementById("hasil-error");
const hasilTbody = document.getElementById("hasil-tbody");
const chkAll = document.getElementById("chk-all");
const btnHapusTerpilih = document.getElementById("btn-hapus-terpilih");

const confirmOverlay = document.getElementById("confirm-overlay");
const confirmClose = document.getElementById("confirm-close");
const confirmSub = document.getElementById("confirm-sub");
const confirmError = document.getElementById("confirm-error");
const confirmHapus = document.getElementById("confirm-hapus");

let currentRows = []; // hasil pencarian terakhir
let selectedIds = new Set();

function showError(msg) {
  hasilError.hidden = false;
  hasilError.textContent = msg;
}
function clearError() {
  hasilError.hidden = true;
  hasilError.textContent = "";
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function formatTanggal(row, type) {
  const raw = type === "laporan" ? row.tanggal : row.tanggal_inspeksi;
  if (!raw) return "-";
  return new Date(raw).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

// ---------- CARI ----------
async function cariData() {
  clearError();
  chkAll.checked = false;
  selectedIds = new Set();
  updateHapusButton();

  const type = fJenis.value;
  const cfg = DATA_TYPES[type];
  const sebelum = fSebelum.value;

  if (!sebelum) {
    showError("Isi dulu tanggal batasnya.");
    return;
  }

  hasilCount.textContent = "Mencari…";
  hasilTbody.innerHTML = `<tr><td colspan="6" class="table-empty">Memuat data…</td></tr>`;

  // Batasi ke status yang dipilih (approved / rejected / dua-duanya),
  // dan yang direview sebelum tanggal batas. Draft sengaja ga masuk opsi
  // sama sekali (masih perlu direview SPV). Limit 200 baris per
  // pencarian biar aman (bisa dicari lagi kalau masih banyak sisa).
  const statuses = fStatus.value.split(",");
  const { data, error } = await supabase
    .from(cfg.table)
    .select(cfg.selectFields + ", review_status")
    .in("review_status", statuses)
    .lt("reviewed_at", sebelum)
    .order("reviewed_at", { ascending: true })
    .limit(200);

  if (error) {
    console.error(error);
    showError("Gagal memuat data: " + error.message);
    hasilCount.textContent = "";
    hasilTbody.innerHTML = `<tr><td colspan="6" class="table-empty">Gagal memuat data.</td></tr>`;
    return;
  }

  currentRows = data || [];
  renderTable(type);
}

function renderTable(type) {
  const cfg = DATA_TYPES[type];

  if (currentRows.length === 0) {
    hasilCount.textContent = "Tidak ada data yang cocok dengan filter itu.";
    hasilTbody.innerHTML = `<tr><td colspan="6" class="table-empty">Tidak ada data.</td></tr>`;
    return;
  }

  hasilCount.textContent = `${currentRows.length} data ditemukan.`;

  hasilTbody.innerHTML = currentRows
    .map((row) => {
      const fotoCount = cfg.getFotos(row).length;
      const statusBadge =
        row.review_status === "approved"
          ? `<span class="badge-status badge-approved">Approved</span>`
          : `<span class="badge-status badge-rejected">Rejected</span>`;
      const direview = row.reviewed_by
        ? `${escapeHtml(row.reviewed_by)}<br><span class="table-sub">${new Date(row.reviewed_at).toLocaleDateString("id-ID")}</span>`
        : "-";
      return `
        <tr>
          <td><input type="checkbox" class="chk-row" data-id="${row.id}" /></td>
          <td>${formatTanggal(row, type)}</td>
          <td>${escapeHtml(cfg.renderDetail(row))}</td>
          <td>${statusBadge}</td>
          <td>${direview}</td>
          <td>${fotoCount}</td>
        </tr>
      `;
    })
    .join("");

  hasilTbody.querySelectorAll(".chk-row").forEach((chk) => {
    chk.addEventListener("change", () => {
      if (chk.checked) selectedIds.add(chk.dataset.id);
      else selectedIds.delete(chk.dataset.id);
      updateHapusButton();
    });
  });
}

function updateHapusButton() {
  btnHapusTerpilih.disabled = selectedIds.size === 0;
  btnHapusTerpilih.textContent =
    selectedIds.size > 0 ? `Hapus ${selectedIds.size} data terpilih` : "Hapus data terpilih";
}

chkAll.addEventListener("change", () => {
  const boxes = hasilTbody.querySelectorAll(".chk-row");
  boxes.forEach((chk) => {
    chk.checked = chkAll.checked;
    if (chkAll.checked) selectedIds.add(chk.dataset.id);
    else selectedIds.delete(chk.dataset.id);
  });
  updateHapusButton();
});

btnCari.addEventListener("click", cariData);

// ---------- HAPUS ----------
function openConfirm() {
  const type = fJenis.value;
  const rows = currentRows.filter((r) => selectedIds.has(r.id));
  const totalFoto = rows.reduce((sum, r) => sum + DATA_TYPES[type].getFotos(r).length, 0);

  confirmError.hidden = true;
  confirmSub.textContent = `${rows.length} data (${totalFoto} foto) akan dihapus permanen, termasuk file fotonya di storage. Yakin lanjut?`;
  confirmOverlay.hidden = false;
}

function closeConfirm() {
  confirmOverlay.hidden = true;
}

btnHapusTerpilih.addEventListener("click", openConfirm);
confirmClose.addEventListener("click", closeConfirm);
confirmOverlay.addEventListener("click", (e) => {
  if (e.target === confirmOverlay) closeConfirm();
});

// Ambil path relatif dari public URL supabase storage, buat dipakai di .remove()
function pathFromPublicUrl(url, bucket) {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length);
}

// Storage API biasanya oke buat ratusan path sekaligus, tapi kita
// pecah per 100 biar aman dari kemungkinan limit request.
async function removeInChunks(bucket, paths) {
  const chunkSize = 100;
  for (let i = 0; i < paths.length; i += chunkSize) {
    const chunk = paths.slice(i, i + chunkSize);
    const { error } = await supabase.storage.from(bucket).remove(chunk);
    if (error) throw error;
  }
}

confirmHapus.addEventListener("click", async () => {
  const type = fJenis.value;
  const cfg = DATA_TYPES[type];
  const rows = currentRows.filter((r) => selectedIds.has(r.id));

  confirmHapus.disabled = true;
  confirmHapus.textContent = "Menghapus…";
  confirmError.hidden = true;

  try {
    // 1) Kumpulin semua path foto dari baris yang mau dihapus
    const paths = [];
    for (const row of rows) {
      for (const foto of cfg.getFotos(row)) {
        const path = pathFromPublicUrl(foto.foto_url, cfg.bucket);
        if (path) paths.push(path);
      }
    }

    // 2) Hapus file fisiknya dulu di storage
    if (paths.length > 0) {
      await removeInChunks(cfg.bucket, paths);
    }

    // 3) Baru hapus row-nya (row di tabel foto ikut kehapus otomatis
    //    lewat "on delete cascade")
    const ids = rows.map((r) => r.id);
    const { error } = await supabase.from(cfg.table).delete().in("id", ids);
    if (error) throw error;

    const session = getSession();
    logAuditBulk(
      supabase,
      rows.map((row) => ({
        actorId: session?.userId,
        actorUsername: session?.username,
        actorNama: session?.nama,
        actorRole: session?.role,
        action: "hapus_data",
        entityType: type,
        entityId: row.id,
        entityLabel: cfg.renderDetail(row),
        detail: `Status: ${row.review_status === "approved" ? "Approved" : "Rejected"}${
          row.reviewed_by ? " · direview oleh " + row.reviewed_by : ""
        }`,
      }))
    );

    closeConfirm();
    currentRows = currentRows.filter((r) => !selectedIds.has(r.id));
    selectedIds = new Set();
    chkAll.checked = false;
    renderTable(type);
    updateHapusButton();
  } catch (err) {
    console.error(err);
    confirmError.hidden = false;
    confirmError.textContent = "Gagal menghapus: " + err.message;
  } finally {
    confirmHapus.disabled = false;
    confirmHapus.textContent = "Ya, hapus permanen";
  }
});
