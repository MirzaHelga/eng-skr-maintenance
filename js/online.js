import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
import { ROLE_LABEL } from "./auth.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000; // update < 5 menit lalu = online
const REFRESH_MS = 20000;

const onlineSub = document.getElementById("online-sub");
const onlineError = document.getElementById("online-error");
const statOnline = document.getElementById("online-stat-online");
const statAkun = document.getElementById("online-stat-akun");
const statLokasi = document.getElementById("online-stat-lokasi");
const statTotal = document.getElementById("online-stat-total");
const tbody = document.getElementById("online-tbody");
const mapEl = document.getElementById("online-map");

let leafletLoadPromise = null;
let map = null;
let markers = [];

function loadLeaflet() {
  if (!leafletLoadPromise) {
    leafletLoadPromise = import("https://esm.sh/leaflet@1.9.4")
      .then((mod) => mod.default || mod)
      .catch((err) => {
        leafletLoadPromise = null;
        throw new Error(
          "Peta (Leaflet) gagal dimuat dari esm.sh (jaringan bermasalah atau esm.sh diblokir). (" +
            (err?.message || err) +
            ")"
        );
      });
  }
  return leafletLoadPromise;
}

function showError(msg) {
  onlineError.textContent = msg;
  onlineError.hidden = false;
}

function isOnline(row) {
  return Date.now() - new Date(row.updated_at).getTime() < ONLINE_THRESHOLD_MS;
}

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return "baru saja";
  if (diffMin < 60) return `${diffMin} menit lalu`;
  const diffJam = Math.round(diffMin / 60);
  if (diffJam < 24) return `${diffJam} jam lalu`;
  const diffHari = Math.round(diffJam / 24);
  return `${diffHari} hari lalu`;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function renderTable(rows) {
  if (rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="table-empty">Belum ada data. Presence akan muncul begitu ada user yang login.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows
    .map((row) => {
      const online = isOnline(row);
      const hasLokasi = row.latitude != null && row.longitude != null;
      return `
        <tr>
          <td>
            <span class="online-status-dot ${online ? "is-online" : "is-offline"}">
              ${online ? "Online" : "Offline"}
            </span>
          </td>
          <td>${escapeHtml(row.nama || row.username)}</td>
          <td>${escapeHtml(ROLE_LABEL[row.role] || row.role || "-")}</td>
          <td>${escapeHtml(row.device_label || "-")}</td>
          <td>${escapeHtml(row.halaman || "-")}</td>
          <td>${timeAgo(row.updated_at)}</td>
          <td>${hasLokasi ? "📍 Ada" : "Tidak ada"}</td>
        </tr>
      `;
    })
    .join("");
}

async function renderMap(rows) {
  let L;
  try {
    L = await loadLeaflet();
  } catch (err) {
    console.error(err);
    showError(err.message);
    return;
  }

  if (!map) {
    map = L.map(mapEl).setView([-6.2, 106.8], 5); // default: Indonesia
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);
  }

  markers.forEach((m) => m.remove());
  markers = [];

  const withLokasi = rows.filter((r) => r.latitude != null && r.longitude != null);

  for (const row of withLokasi) {
    const online = isOnline(row);
    const marker = L.circleMarker([row.latitude, row.longitude], {
      radius: 9,
      color: "#fff",
      weight: 2,
      fillColor: online ? "#1F9D55" : "#9AA5B1",
      fillOpacity: 0.95,
    }).addTo(map);

    marker.bindPopup(`
      <div class="online-popup">
        <strong>${escapeHtml(row.nama || row.username)}</strong>
        ${escapeHtml(ROLE_LABEL[row.role] || row.role || "-")} · ${escapeHtml(row.device_label || "-")}<br/>
        ${escapeHtml(row.halaman || "-")} · ${timeAgo(row.updated_at)}
      </div>
    `);
    markers.push(marker);
  }

  if (withLokasi.length > 0) {
    const bounds = L.latLngBounds(withLokasi.map((r) => [r.latitude, r.longitude]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
  }
}

async function loadAndRender() {
  onlineError.hidden = true;

  const { data, error } = await supabase
    .from("user_presence")
    .select("user_id, device_id, device_label, username, nama, role, halaman, latitude, longitude, accuracy, updated_at")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error(error);
    showError(
      "Gagal memuat data online. Pastikan sql/add_user_presence.sql sudah dijalankan di Supabase. (" +
        (error.message || "unknown error") +
        ")"
    );
    tbody.innerHTML = `<tr><td colspan="7" class="table-empty">Gagal memuat data.</td></tr>`;
    onlineSub.textContent = "Gagal memuat.";
    return;
  }

  const rows = data || [];
  const onlineCount = rows.filter(isOnline).length;
  const lokasiCount = rows.filter((r) => r.latitude != null && r.longitude != null).length;
  const akunOnlineCount = new Set(rows.filter(isOnline).map((r) => r.user_id)).size;

  statOnline.textContent = String(onlineCount);
  statAkun.textContent = String(akunOnlineCount);
  statLokasi.textContent = String(lokasiCount);
  statTotal.textContent = String(rows.length);
  onlineSub.textContent = `Update otomatis tiap ${REFRESH_MS / 1000} detik · terakhir dimuat ${new Date().toLocaleTimeString("id-ID")}`;

  renderTable(rows);
  await renderMap(rows);
}

loadAndRender();
setInterval(loadAndRender, REFRESH_MS);
