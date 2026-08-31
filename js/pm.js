import { CHECKLIST_CATEGORIES } from "./checklist-data.js";

const container = document.getElementById("pm-categories");
const selectWrap = document.getElementById("pm-category-select-wrap");

// Dropdown untuk memilih equipment/kategori
selectWrap.innerHTML = `
  <div class="pm-select-card">
    <label class="pm-select-label" for="pm-category-select">Pilih Equipment</label>
    <select id="pm-category-select">
      <option value="all">Semua Equipment</option>
      ${CHECKLIST_CATEGORIES.map((category) => `
        <option value="${encodeURIComponent(category.label)}">${category.label}</option>
      `).join("")}
    </select>
  </div>
`;

const select = document.getElementById("pm-category-select");

// Prioritas pilihan awal: ?category= di URL (dari QR code per mesin) > filter
// terakhir yang tersimpan di session (biar tidak reset saat balik dari halaman checklist).
const params = new URLSearchParams(window.location.search);
const categoryFromUrl = params.get("category");
const savedFilter = sessionStorage.getItem("pm-category-filter");

if (categoryFromUrl) {
  select.value = categoryFromUrl;
  sessionStorage.setItem("pm-category-filter", categoryFromUrl);
} else if (savedFilter) {
  select.value = savedFilter;
}

render(select.value);

select.addEventListener("change", () => {
  sessionStorage.setItem("pm-category-filter", select.value);
  render(select.value);
});

function render(filter) {
  const categories = filter && filter !== "all"
    ? CHECKLIST_CATEGORIES.filter((c) => encodeURIComponent(c.label) === filter)
    : CHECKLIST_CATEGORIES;

  if (!categories.length) {
    container.innerHTML = `<p class="pm-empty">Equipment tidak ditemukan.</p>`;
    return;
  }

  container.innerHTML = categories.map((category) => `
    <section class="pm-category">
      <h2 class="pm-category-title">${category.label}</h2>
      <div class="pm-card-grid">
        ${category.checklists.map((c) => `
          <a class="pm-card" href="checklist.html?id=${encodeURIComponent(c.id)}">
            <span class="pm-card-periode">${c.periodeLabel}</span>
            <span class="pm-card-title">${c.title}</span>
          </a>
        `).join("")}
      </div>
    </section>
  `).join("");
}
