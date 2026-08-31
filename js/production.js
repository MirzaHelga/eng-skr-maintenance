import { PRODUCTION_LINES, PRODUCTION_CATEGORIES } from "./production-data.js";

const linesContainer = document.getElementById("production-lines");
const categoriesContainer = document.getElementById("production-categories");
const topbarSub = document.getElementById("production-topbar-sub");

const params = new URLSearchParams(window.location.search);
const selectedLine = params.get("line");
const activeLine = PRODUCTION_LINES.find((l) => l.key === selectedLine) || null;

if (!activeLine) {
  renderLinePicker();
} else {
  renderCategories(activeLine);
}

function renderLinePicker() {
  topbarSub.textContent = "Pilih line produksi";
  categoriesContainer.innerHTML = "";
  linesContainer.innerHTML = `
    <div class="pm-select-card">
      <label class="pm-select-label" for="production-line-select">Pilih Line Produksi</label>
      <select id="production-line-select">
        <option value="" disabled selected>Pilih line...</option>
        ${PRODUCTION_LINES.map((line) => `
          <option value="${encodeURIComponent(line.key)}">${line.label}</option>
        `).join("")}
      </select>
    </div>
    <div class="production-line-grid">
      ${PRODUCTION_LINES.map((line) => `
        <a class="production-line-card production-line-card--${line.key}" href="production.html?line=${encodeURIComponent(line.key)}">
          <span class="production-line-card-title">${line.label}</span>
          <span class="production-line-card-desc">${line.desc}</span>
          <span class="production-line-card-cta">Lihat equipment</span>
        </a>
      `).join("")}
    </div>
  `;

  const lineSelect = document.getElementById("production-line-select");
  lineSelect.addEventListener("change", () => {
    if (lineSelect.value) {
      window.location.href = `production.html?line=${lineSelect.value}`;
    }
  });
}

function renderCategories(line) {
  topbarSub.textContent = `Line ${line.label} · pilih equipment & periode checklist`;

  const categories = PRODUCTION_CATEGORIES.filter((cat) => cat.line === line.key);

  linesContainer.innerHTML = `
    <a href="production.html" class="pm-back-btn">
      Ganti line produksi
    </a>
    <div class="pm-select-card">
      <label class="pm-select-label" for="production-category-select">Pilih Equipment</label>
      <select id="production-category-select">
        <option value="all">Semua Equipment</option>
        ${categories.map((cat) => `
          <option value="${encodeURIComponent(cat.label)}">${cat.label}</option>
        `).join("")}
      </select>
    </div>
  `;

  const categorySelect = document.getElementById("production-category-select");

  // ?category= di URL (dari QR code per mesin) -> langsung filter ke equipment itu.
  const categoryFromUrl = params.get("category");
  if (categoryFromUrl) {
    categorySelect.value = categoryFromUrl;
  }

  renderCategoryCards(categories, categorySelect.value || "all");

  categorySelect.addEventListener("change", () => {
    renderCategoryCards(categories, categorySelect.value);
  });
}

function renderCategoryCards(categories, filter) {
  const filtered = filter && filter !== "all"
    ? categories.filter((c) => encodeURIComponent(c.label) === filter)
    : categories;

  if (!filtered.length) {
    categoriesContainer.innerHTML = `<p class="pm-empty">Equipment tidak ditemukan.</p>`;
    return;
  }

  categoriesContainer.innerHTML = filtered.map((category) => `
    <section class="pm-category">
      <h2 class="pm-category-title">${category.label}</h2>
      <div class="pm-card-grid">
        ${category.checklists.map((c) => `
          <a class="pm-card" href="production-checklist.html?id=${encodeURIComponent(c.id)}">
            <span class="pm-card-periode">${c.periodeLabel}</span>
            <span class="pm-card-title">${c.title}</span>
          </a>
        `).join("")}
      </div>
    </section>
  `).join("");
}
