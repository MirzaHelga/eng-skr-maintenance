import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---------- ELEMENTS ----------
const statTotal = document.getElementById("stat-total");
const statBreakdown = document.getElementById("stat-breakdown");
const statMaintenance = document.getElementById("stat-maintenance");
const statRunning = document.getElementById("stat-running");
const statDraft = document.getElementById("stat-draft");
const dashError = document.getElementById("dash-error");
const recentList = document.getElementById("dash-recent-list");
const dashDate = document.getElementById("dash-date");

const distRunning = document.getElementById("dist-running");
const distStandby = document.getElementById("dist-standby");
const distMaintenance = document.getElementById("dist-maintenance");
const distBreakdown = document.getElementById("dist-breakdown");

const STATUS_CLASS = {
  Running: "running",
  Standby: "standby",
  Maintenance: "maintenance",
  Breakdown: "breakdown",
};

function todayLocalISODate() {
  // Supaya "hari ini" mengikuti tanggal lokal HP/PC, bukan UTC.
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function formatTanggal(tanggal) {
  if (!tanggal) return "";
  const [y, m, d] = tanggal.split("-");
  return `${d}-${m}-${y}`;
}

function showError(msg) {
  dashError.textContent = msg;
  dashError.hidden = false;
}

// ---------- RINGKASAN HARI INI ----------
async function loadStats() {
  const today = todayLocalISODate();

  const { data, error } = await supabase
    .from("laporan")
    .select("status")
    .eq("tanggal", today);

  if (error) {
    console.error(error);
    showError(
      "Gagal memuat ringkasan. Pastikan policy baca tabel laporan sudah dijalankan (lihat sql/add_rekap_read_policy.sql). (" +
        (error.message || "unknown error") +
        ")"
    );
    statTotal.textContent = "–";
    statBreakdown.textContent = "–";
    statMaintenance.textContent = "–";
    statRunning.textContent = "–";
    distRunning.textContent = "–";
    distStandby.textContent = "–";
    distMaintenance.textContent = "–";
    distBreakdown.textContent = "–";
    return;
  }

  const rows = data || [];
  const total = rows.length;
  const countByStatus = { Running: 0, Standby: 0, Maintenance: 0, Breakdown: 0 };
  for (const row of rows) {
    if (row.status in countByStatus) countByStatus[row.status]++;
  }

  statTotal.textContent = String(total);
  statBreakdown.textContent = String(countByStatus.Breakdown);
  statMaintenance.textContent = String(countByStatus.Maintenance);
  statRunning.textContent =
    total > 0 ? `${Math.round((countByStatus.Running / total) * 100)}%` : "–";

  distRunning.textContent = String(countByStatus.Running);
  distStandby.textContent = String(countByStatus.Standby);
  distMaintenance.textContent = String(countByStatus.Maintenance);
  distBreakdown.textContent = String(countByStatus.Breakdown);
}

// ---------- DRAFT MENUNGGU REVIEW ----------
async function loadDraftCount() {
  const [laporanRes, checklistRes, productionRes] = await Promise.all([
    supabase.from("laporan").select("id", { count: "exact", head: true }).eq("review_status", "draft"),
    supabase
      .from("pm_checklist_submission")
      .select("id", { count: "exact", head: true })
      .eq("review_status", "draft"),
    supabase
      .from("production_checklist_submission")
      .select("id", { count: "exact", head: true })
      .eq("review_status", "draft"),
  ]);

  if (laporanRes.error || checklistRes.error || productionRes.error) {
    console.error(laporanRes.error || checklistRes.error || productionRes.error);
    statDraft.textContent = "–";
    return;
  }

  statDraft.textContent = String((laporanRes.count || 0) + (checklistRes.count || 0) + (productionRes.count || 0));
}

function renderDashDate() {
  const now = new Date();
  dashDate.textContent = now.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ---------- LAPORAN TERBARU ----------
async function loadRecent() {
  const { data, error } = await supabase
    .from("laporan")
    .select("tanggal, jam_mulai, jam_selesai, shift, status, equipment:equipment_id(nama), mesin:mesin_id(nama)")
    .order("tanggal", { ascending: false })
    .order("jam_mulai", { ascending: false })
    .limit(7);

  if (error) {
    console.error(error);
    recentList.innerHTML = `<p class="table-empty">Gagal memuat laporan terbaru.</p>`;
    return;
  }

  const rows = data || [];
  if (rows.length === 0) {
    recentList.innerHTML = `<p class="table-empty">Belum ada laporan.</p>`;
    return;
  }

  recentList.innerHTML = "";
  for (const row of rows) {
    const item = document.createElement("div");
    item.className = "dash-recent-item";
    const statusClass = STATUS_CLASS[row.status] || "";
    const jamMulai = row.jam_mulai ? row.jam_mulai.slice(0, 5) : "";
    const jamSelesai = row.jam_selesai ? row.jam_selesai.slice(0, 5) : "";
    const jam = jamMulai || jamSelesai ? `${jamMulai}–${jamSelesai}` : "";
    item.innerHTML = `
      <div class="dash-recent-main">
        <p class="dash-recent-equipment">${escapeHtml(row.equipment?.nama ?? row.mesin?.nama ?? "-")}</p>
        <p class="dash-recent-meta">${formatTanggal(row.tanggal)} · ${row.shift ?? ""} · ${jam}</p>
      </div>
      <span class="status-badge status-${statusClass}">${row.status ?? ""}</span>
    `;
    recentList.appendChild(item);
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ---------- INIT ----------
renderDashDate();
loadStats();
loadRecent();
loadDraftCount();
