import QRCode from "https://esm.sh/qrcode@1.5.3";
import { CHECKLIST_CATEGORIES } from "./checklist-data.js";
import { PRODUCTION_LINES, PRODUCTION_CATEGORIES } from "./production-data.js";

// ---------- ELEMENTS ----------
const fJenis = document.getElementById("f-jenis");
const fCari = document.getElementById("f-cari");
const btnPrint = document.getElementById("btn-print");
const qrError = document.getElementById("qr-error");
const qrCount = document.getElementById("qr-count");
const qrGrid = document.getElementById("qr-grid");

function showError(msg) {
  qrError.textContent = msg;
  qrError.hidden = false;
}

// Origin+path halaman ini dipakai untuk membangun URL absolut, supaya QR
// otomatis benar di domain/hosting mana pun app ini dipasang.
function baseUrl(targetPage) {
  const path = window.location.pathname.replace(/qrcode\.html$/, targetPage);
  return `${window.location.origin}${path}`;
}

// ---------- DAFTAR MESIN (bukan dari database laporan, tapi dari daftar
// checklist PM Utility & Production yang sudah didefinisikan di app) ----------

// Mesin Utility (Compressor, Genset, AHU, dll) -> link ke Checklist PM Utility,
// dengan equipment-nya sudah kefilter otomatis.
const utilityMachines = CHECKLIST_CATEGORIES.map((category) => ({
  jenis: "utility",
  jenisLabel: "Utility",
  nama: category.label,
  meta: "Checklist PM Utility",
  url: `${baseUrl("pm.html")}?category=${encodeURIComponent(category.label)}`,
}));

// Mesin/equipment Production (per line) -> link ke Checklist Production,
// dengan line + equipment-nya sudah kefilter otomatis.
const lineByKey = Object.fromEntries(PRODUCTION_LINES.map((l) => [l.key, l]));
const productionMachines = PRODUCTION_CATEGORIES.map((category) => {
  const line = lineByKey[category.line];
  return {
    jenis: "production",
    jenisLabel: "Production",
    nama: category.label,
    meta: `Checklist Production · ${line?.label || category.line}`,
    url: `${baseUrl("production.html")}?line=${encodeURIComponent(category.line)}&category=${encodeURIComponent(category.label)}`,
  };
});

const allMachines = [...utilityMachines, ...productionMachines];

function matchesFilter(machine, jenisFilter, searchTerm) {
  if (jenisFilter && machine.jenis !== jenisFilter) return false;
  if (!searchTerm) return true;
  const haystack = `${machine.nama} ${machine.meta}`.toLowerCase();
  return haystack.includes(searchTerm);
}

function render() {
  const jenisFilter = fJenis.value || "";
  const searchTerm = (fCari.value || "").trim().toLowerCase();

  const filtered = allMachines
    .filter((m) => matchesFilter(m, jenisFilter, searchTerm))
    .sort((a, b) => a.jenisLabel.localeCompare(b.jenisLabel) || a.nama.localeCompare(b.nama));

  qrCount.textContent = `${filtered.length} mesin ditemukan`;

  if (filtered.length === 0) {
    qrGrid.innerHTML = `<p class="table-empty">Tidak ada mesin yang cocok dengan filter ini.</p>`;
    return;
  }

  qrGrid.innerHTML = filtered
    .map(
      (machine, i) => `
      <div class="qr-card">
        <canvas class="qr-canvas" data-index="${i}"></canvas>
        <p class="qr-card-equipment"></p>
        <p class="qr-card-meta"></p>
      </div>
    `
    )
    .join("");

  // Isi teks pakai textContent (bukan template string) supaya aman dari
  // karakter aneh di nama mesin, lalu render QR per canvas.
  const cards = qrGrid.querySelectorAll(".qr-card");
  filtered.forEach((machine, i) => {
    const card = cards[i];
    card.querySelector(".qr-card-equipment").textContent = machine.nama;
    card.querySelector(".qr-card-meta").textContent = machine.meta;

    const canvas = card.querySelector(".qr-canvas");
    QRCode.toCanvas(canvas, machine.url, { width: 160, margin: 1 }, (err) => {
      if (err) console.error("Gagal render QR untuk", machine.nama, err);
    });
  });
}

fJenis.addEventListener("change", render);
fCari.addEventListener("input", debounce(render, 200));
btnPrint.addEventListener("click", () => window.print());

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

try {
  render();
} catch (err) {
  console.error(err);
  showError("Gagal memuat daftar mesin.");
  qrCount.textContent = "";
}
