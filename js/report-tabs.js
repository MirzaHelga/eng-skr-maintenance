import { getRole, isSpvOrAbove } from "./auth.js";

// Halaman ini gabungan "Input laporan" (semua role) + "Rekap laporan"
// (khusus SPV/superadmin). Tab Rekap cuma dimunculkan untuk role yang
// memang berhak — sama seperti pembatasan halaman rekap.html yang lama.
const tabInput = document.querySelector('.draft-tab[data-tab="input"]');
const tabRekap = document.getElementById("report-tab-rekap");
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
