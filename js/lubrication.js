import { LUBRICATION_LINES, lubricationItemsFor, frekuensiGroupsForLine } from "./lubrication-data.js";

const linesContainer = document.getElementById("lubrication-lines");
const topbarSub = document.getElementById("lubrication-topbar-sub");

const params = new URLSearchParams(window.location.search);
const selectedLineKey = params.get("line");
const activeLine = selectedLineKey ? LUBRICATION_LINES.find((l) => l.key === selectedLineKey) : null;

if (!activeLine) {
  renderLinePicker();
} else {
  renderFrekuensiPicker(activeLine);
}

// ---------- STEP 1: pilih line ----------
function renderLinePicker() {
  topbarSub.textContent = "Pilih line produksi";

  linesContainer.innerHTML = `
    <div class="production-line-grid">
      ${LUBRICATION_LINES.map((line) => {
        const itemCount = lubricationItemsFor(line.key).length;
        const criticalCount = lubricationItemsFor(line.key).filter((i) => i.critical).length;
        return `
          <a class="production-line-card production-line-card--lube-${line.key}" href="lubrication.html?line=${encodeURIComponent(line.key)}">
            <span class="production-line-card-title">${line.label}</span>
            <span class="production-line-card-desc">${line.desc}</span>
            <span class="production-line-card-desc">${itemCount} titik lubrikasi${criticalCount ? ` · ${criticalCount} critical point` : ""}</span>
            <span class="production-line-card-cta">Pilih kategori &rarr;</span>
          </a>
        `;
      }).join("")}
    </div>
  `;
}

// ---------- STEP 2: pilih kategori frekuensi (Shiftly / Mingguan / dst) ----------
// Tiap kategori = form checklist sendiri, terpisah dari kategori lain
// di line yang sama (lihat lubrication-checklist.js?line=...&freq=...).
function renderFrekuensiPicker(line) {
  topbarSub.textContent = `${line.label} · pilih kategori frekuensi checklist`;

  const groups = frekuensiGroupsForLine(line.key);

  linesContainer.innerHTML = `
    <a href="lubrication.html" class="pm-back-btn">
      Ganti line produksi
    </a>
    <div class="pm-card-grid">
      ${groups.map((g) => `
        <a class="pm-card" href="lubrication-checklist.html?line=${encodeURIComponent(line.key)}&freq=${encodeURIComponent(g.key)}">
          <span class="pm-card-periode">${g.label}</span>
          <span class="pm-card-title">${g.count} titik lubrikasi</span>
        </a>
      `).join("")}
    </div>
  `;
}
