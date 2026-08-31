import { getRole, isSpvOrAbove } from "./auth.js";

// Halaman ini gabungan "Isi Lubrication" (semua role) + "Rekap
// Lubrication" (khusus SPV/superadmin) — pola sama seperti
// production-tabs.js/report-tabs.js.
const tabInput = document.querySelector('.draft-tab[data-tab="input"]');
const tabRekap = document.getElementById("lubrication-tab-rekap");
const panelInput = document.getElementById("panel-input");
const panelRekap = document.getElementById("panel-rekap");

function showTab(tab) {
  const isRekap = tab === "rekap" && !tabRekap.hidden;
  tabInput.classList.toggle("active", !isRekap);
  tabRekap.classList.toggle("active", isRekap);
  panelInput.hidden = isRekap;
  panelRekap.hidden = !isRekap;
}

tabInput.addEventListener("click", () => showTab("input"));
tabRekap.addEventListener("click", () => showTab("rekap"));

const role = getRole();
if (isSpvOrAbove(role)) {
  tabRekap.hidden = false;
}

const params = new URLSearchParams(window.location.search);
if (params.get("tab") === "rekap" && !tabRekap.hidden) {
  showTab("rekap");
}
