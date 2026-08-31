import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---------- ELEMENTS ----------
const fBulan = document.getElementById("f-bulan");
const fArea = document.getElementById("f-area");
const fJumlahBulan = document.getElementById("f-jumlah-bulan");
const btnFilter = document.getElementById("btn-filter");
const btnReset = document.getElementById("btn-reset");
const trendError = document.getElementById("trend-error");

const statusTrendSub = document.getElementById("trend-status-sub");
const distSub = document.getElementById("trend-dist-sub");
const breakdownSub = document.getElementById("trend-breakdown-sub");
const trendTbody = document.getElementById("trend-tbody");

const STATUS_COLORS = {
  Running: "#12864B",
  Standby: "#64748B",
  Maintenance: "#C2760C",
  Breakdown: "#D6483F",
};
const STATUS_ORDER = ["Running", "Standby", "Maintenance", "Breakdown"];

let chartStatusTrend = null;
let chartStatusDonut = null;
let chartBreakdownMesin = null;

// ---------- HELPERS ----------
function showError(msg) {
  trendError.textContent = msg;
  trendError.hidden = false;
}
function clearError() {
  trendError.hidden = true;
  trendError.textContent = "";
}

function currentMonthValue() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
}

// "2026-08" -> { start: "2026-08-01", end: "2026-08-31" }
function monthRange(monthValue) {
  const [y, m] = monthValue.split("-").map(Number);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 0); // hari terakhir bulan itu
  const pad = (n) => String(n).padStart(2, "0");
  const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return { start: toISO(start), end: toISO(end) };
}

// list bulan mundur N bulan dari monthValue, urut lama -> baru
function lastNMonths(monthValue, n) {
  const [y, m] = monthValue.split("-").map(Number);
  const months = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(y, m - 1 - i, 1);
    const pad = (v) => String(v).padStart(2, "0");
    months.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`);
  }
  return months;
}

function monthLabel(monthValue) {
  const [y, m] = monthValue.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString("id-ID", { month: "short", year: "2-digit" });
}

// ---------- CHART.JS ----------
// Sebelumnya dimuat lewat <script src="https://cdnjs.cloudflare.com/...">
// biasa — ternyata di beberapa jaringan (firewall/proxy kantor) domain
// cdnjs.cloudflare.com diblokir sepenuhnya, jadi Chart.js gak pernah
// kebuka walau ditunggu berapa lama pun. Sekarang dimuat lewat
// dynamic import() dari esm.sh — domain yang sama yang sudah dipakai
// buat @supabase/supabase-js & xlsx di halaman lain, jadi kalau app ini
// bisa login/export Excel, Chart.js juga pasti bisa kebuka lewat sini.
let chartJsLoadPromise = null;
function loadChartJs() {
  if (!chartJsLoadPromise) {
    chartJsLoadPromise = import("https://esm.sh/chart.js@4.4.4/auto")
      .then((mod) => {
        // Simpan ke window.Chart supaya kode render di bawah (yang
        // sudah pakai `new Chart(...)` sebagai variabel global) tidak
        // perlu diubah sama sekali.
        window.Chart = mod.Chart || mod.default;
        return window.Chart;
      })
      .catch((err) => {
        // Biar bisa dicoba lagi (mis. kalau tadinya internet putus
        // sebentar) alih-alih nyangkut gagal terus selamanya.
        chartJsLoadPromise = null;
        throw new Error(
          "Chart.js gagal dimuat dari esm.sh (jaringan bermasalah atau esm.sh diblokir). (" +
            (err?.message || err) +
            ")"
        );
      });
  }
  return chartJsLoadPromise;
}

// ---------- FILTER SETUP ----------
async function loadAreaFilter() {
  const { data, error } = await supabase.from("area").select("id, nama").order("nama");
  if (error) {
    console.error(error);
    return;
  }
  for (const area of data || []) {
    const opt = document.createElement("option");
    opt.value = area.id;
    opt.textContent = area.nama;
    fArea.appendChild(opt);
  }
}

function resetFilters() {
  fBulan.value = currentMonthValue();
  fArea.value = "";
  fJumlahBulan.value = "6";
}

// ---------- DATA LOADING ----------
// Ambil semua baris laporan (tanggal, status, mesin, area) dalam rentang
// [awal bulan tertua .. akhir bulan terpilih], sekali query dipakai buat
// semua chart supaya hemat request.
async function fetchRange(rangeStartISO, rangeEndISO, areaId) {
  let query = supabase
    .from("laporan")
    .select("tanggal, status, mesin:mesin_id(nama), area:area_id(nama)")
    .gte("tanggal", rangeStartISO)
    .lte("tanggal", rangeEndISO);

  if (areaId) query = query.eq("area_id", areaId);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

function emptyChartMsg(canvasId, msg) {
  const canvas = document.getElementById(canvasId);
  const wrap = canvas.parentElement;
  canvas.hidden = true;
  let empty = wrap.querySelector(".trend-empty");
  if (!empty) {
    empty = document.createElement("div");
    empty.className = "trend-empty";
    wrap.appendChild(empty);
  }
  empty.textContent = msg;
  empty.hidden = false;
}

function clearEmptyMsg(canvasId) {
  const canvas = document.getElementById(canvasId);
  canvas.hidden = false;
  const wrap = canvas.parentElement;
  const empty = wrap.querySelector(".trend-empty");
  if (empty) empty.hidden = true;
}

// ---------- RENDER: TREND STATUS PER BULAN (stacked bar) ----------
function renderStatusTrend(rows, months) {
  const counts = {};
  for (const month of months) counts[month] = { Running: 0, Standby: 0, Maintenance: 0, Breakdown: 0 };

  for (const row of rows) {
    const month = (row.tanggal || "").slice(0, 7);
    if (counts[month] && row.status in counts[month]) counts[month][row.status]++;
  }

  const totalAll = Object.values(counts).reduce(
    (sum, m) => sum + Object.values(m).reduce((a, b) => a + b, 0),
    0
  );

  if (totalAll === 0) {
    emptyChartMsg("chart-status-trend", "Belum ada laporan pada rentang ini.");
    statusTrendSub.textContent = "Tidak ada data.";
    return;
  }
  clearEmptyMsg("chart-status-trend");
  statusTrendSub.textContent = `${monthLabel(months[0])} – ${monthLabel(months[months.length - 1])} · ${totalAll} laporan`;

  const datasets = STATUS_ORDER.map((status) => ({
    label: status,
    data: months.map((m) => counts[m][status]),
    backgroundColor: STATUS_COLORS[status],
    borderRadius: 3,
    maxBarThickness: 36,
  }));

  chartStatusTrend?.destroy();
  chartStatusTrend = new Chart(document.getElementById("chart-status-trend"), {
    type: "bar",
    data: { labels: months.map(monthLabel), datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { stacked: true, grid: { display: false } },
        y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } },
      },
      plugins: {
        legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 11 } } },
      },
    },
  });
}

// ---------- RENDER: DISTRIBUSI STATUS BULAN TERPILIH (donut) ----------
function renderStatusDonut(rowsInMonth) {
  const counts = { Running: 0, Standby: 0, Maintenance: 0, Breakdown: 0 };
  for (const row of rowsInMonth) {
    if (row.status in counts) counts[row.status]++;
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  if (total === 0) {
    emptyChartMsg("chart-status-donut", "Belum ada laporan bulan ini.");
    distSub.textContent = "Tidak ada data.";
    return;
  }
  clearEmptyMsg("chart-status-donut");
  distSub.textContent = `${total} laporan bulan ini`;

  chartStatusDonut?.destroy();
  chartStatusDonut = new Chart(document.getElementById("chart-status-donut"), {
    type: "doughnut",
    data: {
      labels: STATUS_ORDER,
      datasets: [
        {
          data: STATUS_ORDER.map((s) => counts[s]),
          backgroundColor: STATUS_ORDER.map((s) => STATUS_COLORS[s]),
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "62%",
      plugins: {
        legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 11 } } },
      },
    },
  });
}

// ---------- RENDER: BREAKDOWN PER MESIN (horizontal bar, top 10) ----------
function renderBreakdownPerMesin(rowsInMonth) {
  const counts = {};
  for (const row of rowsInMonth) {
    if (row.status !== "Breakdown") continue;
    const nama = row.mesin?.nama || "(tidak diketahui)";
    counts[nama] = (counts[nama] || 0) + 1;
  }

  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);

  if (entries.length === 0) {
    emptyChartMsg("chart-breakdown-mesin", "Tidak ada laporan Breakdown bulan ini. 🎉");
    breakdownSub.textContent = "Tidak ada breakdown pada bulan ini.";
    return;
  }
  clearEmptyMsg("chart-breakdown-mesin");
  breakdownSub.textContent = `Top ${entries.length} mesin dengan laporan Breakdown terbanyak`;

  chartBreakdownMesin?.destroy();
  chartBreakdownMesin = new Chart(document.getElementById("chart-breakdown-mesin"), {
    type: "bar",
    data: {
      labels: entries.map((e) => e[0]),
      datasets: [
        {
          label: "Breakdown",
          data: entries.map((e) => e[1]),
          backgroundColor: STATUS_COLORS.Breakdown,
          borderRadius: 3,
          maxBarThickness: 22,
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { beginAtZero: true, ticks: { precision: 0 } },
        y: { grid: { display: false } },
      },
      plugins: { legend: { display: false } },
    },
  });
}

// ---------- RENDER: TABEL RANKING LENGKAP ----------
function renderTable(rowsInMonth) {
  const byMesin = {};
  for (const row of rowsInMonth) {
    const nama = row.mesin?.nama || "(tidak diketahui)";
    const areaNama = row.area?.nama || "-";
    const key = nama + "||" + areaNama;
    if (!byMesin[key]) {
      byMesin[key] = { nama, areaNama, total: 0, Running: 0, Standby: 0, Maintenance: 0, Breakdown: 0 };
    }
    byMesin[key].total++;
    if (row.status in byMesin[key]) byMesin[key][row.status]++;
  }

  const rows = Object.values(byMesin).sort((a, b) => b.Breakdown - a.Breakdown || b.total - a.total);

  if (rows.length === 0) {
    trendTbody.innerHTML = `<tr><td colspan="7" class="table-empty">Tidak ada laporan pada bulan ini.</td></tr>`;
    return;
  }

  trendTbody.innerHTML = "";
  for (const r of rows) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(r.nama)}</td>
      <td>${escapeHtml(r.areaNama)}</td>
      <td>${r.total}</td>
      <td>${r.Breakdown}</td>
      <td>${r.Maintenance}</td>
      <td>${r.Standby}</td>
      <td>${r.Running}</td>
    `;
    trendTbody.appendChild(tr);
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ---------- LOAD & RENDER ALL ----------
async function loadAndRender() {
  clearError();
  trendTbody.innerHTML = `<tr><td colspan="7" class="table-empty">Memuat data…</td></tr>`;
  statusTrendSub.textContent = "Memuat…";
  distSub.textContent = "Memuat…";
  breakdownSub.textContent = "Memuat…";

  const selectedMonth = fBulan.value || currentMonthValue();
  const jumlahBulan = Number(fJumlahBulan.value || 6);
  const areaId = fArea.value || null;

  const months = lastNMonths(selectedMonth, jumlahBulan);
  const rangeStart = monthRange(months[0]).start;
  const rangeEnd = monthRange(selectedMonth).end;

  try {
    await loadChartJs();
  } catch (err) {
    console.error(err);
    showError(err.message);
    trendTbody.innerHTML = `<tr><td colspan="7" class="table-empty">Gagal memuat grafik.</td></tr>`;
    return;
  }

  try {
    const rows = await fetchRange(rangeStart, rangeEnd, areaId);
    const rowsInSelectedMonth = rows.filter((r) => (r.tanggal || "").slice(0, 7) === selectedMonth);

    renderStatusTrend(rows, months);
    renderStatusDonut(rowsInSelectedMonth);
    renderBreakdownPerMesin(rowsInSelectedMonth);
    renderTable(rowsInSelectedMonth);
  } catch (err) {
    console.error(err);
    showError(
      "Gagal memuat data trend. Pastikan policy baca tabel laporan sudah dijalankan (lihat sql/add_rekap_read_policy.sql). (" +
        (err.message || "unknown error") +
        ")"
    );
    trendTbody.innerHTML = `<tr><td colspan="7" class="table-empty">Gagal memuat data.</td></tr>`;
  }
}

// ---------- INIT ----------
async function init() {
  resetFilters();
  await loadAreaFilter();
  await loadAndRender();
}

btnFilter.addEventListener("click", loadAndRender);
btnReset.addEventListener("click", () => {
  resetFilters();
  loadAndRender();
});

init();
