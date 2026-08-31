import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
import { findProductionChecklist, butuhNilaiAktual } from "./production-data.js";
import { kirimNotifikasiSpv } from "./notify.js";
import { compressImage } from "./image-compress.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Kolom grid untuk layout "monthly-grid" (1 form isi 12 bulan sekaligus)
// dan "daily-grid" (1 form isi 7 hari sekaligus dalam 1 minggu).
const GRID_COLUMNS = {
  "monthly-grid": ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"],
  "daily-grid": ["Senin", "Selasa", "Rabu", "Kamis", "Jum'at", "Sabtu", "Minggu"],
};

const topbarTitle = document.getElementById("checklist-topbar-title");
const topbarSub = document.getElementById("checklist-topbar-sub");
const notFoundMsg = document.getElementById("checklist-not-found");
const card = document.getElementById("checklist-card");
const form = document.getElementById("form-checklist");

const inputEquipment = document.getElementById("input-equipment");
const inputArea = document.getElementById("input-area");
const inputPeriode = document.getElementById("input-periode");
const labelBulanTahun = document.getElementById("label-bulan-tahun");
const inputBulanTahun = document.getElementById("input-bulan-tahun");
const labelTanggal = document.getElementById("label-tanggal");
const inputTanggal = document.getElementById("input-tanggal");
const labelUraian = document.getElementById("label-uraian");
const gridHint = document.getElementById("checklist-grid-hint");
const itemsContainer = document.getElementById("checklist-items");
const selectOpr = document.getElementById("select-opr");
const inputFotoCamera = document.getElementById("input-foto-camera");
const inputFotoGallery = document.getElementById("input-foto-gallery");
const btnFotoCamera = document.getElementById("btn-foto-camera");
const btnFotoGallery = document.getElementById("btn-foto-gallery");
const photoPreviewGrid = document.getElementById("photo-preview-grid");
const inputCatatan = document.getElementById("input-catatan");
const formError = document.getElementById("form-error");
const btnSubmit = document.getElementById("btn-submit");
const successOverlay = document.getElementById("success-overlay");
const btnNewChecklist = document.getElementById("btn-new-checklist");

window.addEventListener("pageshow", () => {
  successOverlay.hidden = true;
});

// Departemen yang ditampilkan di dropdown Checked By (Operator).
// Catatan: dropdown PIC di form Input Laporan (js/app.js) masih
// Engineering-only secara terpisah — kalau itu juga mau ditambah
// Production, ubah PIC_DEPARTEMEN di sana juga.
const OPR_DEPARTEMEN = ["Engineering", "Production"];
let karyawanList = [];

async function loadKaryawan() {
  const { data, error } = await supabase
    .from("karyawan")
    .select("id, nama, departemen")
    .in("departemen", OPR_DEPARTEMEN)
    .order("nama");

  if (error) {
    console.error(error);
    selectOpr.innerHTML = `<option value="" disabled selected>Gagal memuat data operator</option>`;
    return;
  }

  karyawanList = data || [];
  selectOpr.innerHTML = "";
  const opt0 = document.createElement("option");
  opt0.value = "";
  opt0.textContent = "Pilih operator";
  opt0.disabled = true;
  opt0.selected = true;
  selectOpr.appendChild(opt0);

  for (const k of karyawanList) {
    const opt = document.createElement("option");
    opt.value = k.id;
    opt.textContent = k.nama;
    selectOpr.appendChild(opt);
  }
}

function oprKaryawanNama() {
  const opr = karyawanList.find((k) => k.id === selectOpr.value);
  return opr ? opr.nama : "";
}

loadKaryawan();

// ---------- FOTO EVIDENCE ----------
let selectedFiles = []; // array of { id, file }
let photoIdCounter = 0;

async function addFiles(fileList) {
  for (const file of Array.from(fileList)) {
    const compressed = await compressImage(file);
    selectedFiles.push({ id: ++photoIdCounter, file: compressed });
    renderPhotoGrid();
  }
}

function removeFile(id) {
  selectedFiles = selectedFiles.filter((item) => item.id !== id);
  renderPhotoGrid();
}

function renderPhotoGrid() {
  photoPreviewGrid.innerHTML = "";
  for (const item of selectedFiles) {
    const cell = document.createElement("div");
    cell.className = "photo-cell";

    const img = document.createElement("img");
    img.alt = "Preview foto";
    const reader = new FileReader();
    reader.onload = (e) => { img.src = e.target.result; };
    reader.readAsDataURL(item.file);

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "photo-cell-remove";
    removeBtn.setAttribute("aria-label", "Hapus foto");
    removeBtn.textContent = "✕";
    removeBtn.addEventListener("click", () => removeFile(item.id));

    cell.appendChild(img);
    cell.appendChild(removeBtn);
    photoPreviewGrid.appendChild(cell);
  }
}

btnFotoCamera.addEventListener("click", () => inputFotoCamera.click());
btnFotoGallery.addEventListener("click", () => inputFotoGallery.click());

// Tombol "Ambil foto" (kamera) cuma ditampilkan di HP.
const isMobileDevice = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
if (isMobileDevice) {
  btnFotoCamera.hidden = false;
}

inputFotoCamera.addEventListener("change", () => {
  addFiles(inputFotoCamera.files);
  inputFotoCamera.value = "";
});

inputFotoGallery.addEventListener("change", () => {
  addFiles(inputFotoGallery.files);
  inputFotoGallery.value = "";
});

async function uploadPhoto(file) {
  const ext = file.name.split(".").pop();
  const path = `production-checklist/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("foto-production-checklist").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("foto-production-checklist").getPublicUrl(path);
  return data.publicUrl;
}

// Markup tombol OK/NO, dipakai untuk item yang bukan pengukuran nilai
// aktual (lihat butuhNilaiAktual di production-data.js). "extraClass"
// untuk bedain versi grid (lebih kecil).
function oknoMarkup(extraClass = "", dataAttrs = "") {
  return `
    <div class="checklist-okno ${extraClass}" role="group" ${dataAttrs}>
      <button type="button" class="okno-btn okno-btn--ok" data-value="OK">OK</button>
      <button type="button" class="okno-btn okno-btn--no" data-value="NO">NO</button>
    </div>
  `;
}

// Klik tombol OK/NO: toggle aktif di dalam grup yang sama, simpan nilai
// terpilih di dataset.value grup-nya (dibaca lagi pas submit).
itemsContainer.addEventListener("click", (e) => {
  const btn = e.target.closest(".okno-btn");
  if (!btn) return;
  const group = btn.closest(".checklist-okno");
  group.querySelectorAll(".okno-btn").forEach((b) => b.classList.remove("is-active"));
  btn.classList.add("is-active");
  group.dataset.value = btn.dataset.value;
});

const params = new URLSearchParams(window.location.search);
const checklistId = params.get("id");
const def = checklistId ? findProductionChecklist(checklistId) : null;

const backLink = document.getElementById("production-checklist-back-link");
if (backLink && def?.line) {
  backLink.href = `production.html?line=${encodeURIComponent(def.line)}`;
}

if (!def) {
  notFoundMsg.hidden = false;
} else {
  initChecklist(def);
}

function initChecklist(def) {
  card.hidden = false;
  topbarTitle.textContent = def.title;
  topbarSub.textContent = `${def.categoryLabel} · ${def.periodeLabel}`;
  inputPeriode.value = def.periodeLabel;

  const today = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  inputTanggal.value = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  const gridColumns = GRID_COLUMNS[def.layout] || null;
  const isGrid = !!gridColumns;

  if (def.layout === "monthly-grid") {
    labelBulanTahun.textContent = "Tahun";
    inputBulanTahun.placeholder = "cth. 2026";
    labelTanggal.textContent = "Tanggal Update Terakhir";
    labelUraian.textContent = "Uraian pekerjaan (per bulan)";
  } else if (def.layout === "daily-grid") {
    labelBulanTahun.textContent = "Bulan / Tahun";
    inputBulanTahun.placeholder = "cth. Juli 2026";
    labelTanggal.textContent = "Tanggal Mulai Minggu (Senin)";
    labelUraian.textContent = "Uraian pekerjaan (per hari)";
  } else {
    labelBulanTahun.textContent = "Bulan / Tahun";
    inputBulanTahun.placeholder = "cth. Juli 2026";
    labelTanggal.textContent = "Tanggal Inspeksi";
    labelUraian.textContent = "Uraian pekerjaan";
  }

  gridHint.hidden = !isGrid;
  itemsContainer.classList.toggle("checklist-table--grid", isGrid);

  if (isGrid) {
    itemsContainer.innerHTML = `
      <table class="checklist-grid">
        <thead>
          <tr>
            <th class="checklist-grid-uraian-head">Uraian Pekerjaan</th>
            ${gridColumns.map((col) => `<th>${col}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${def.items.map((item, idx) => `
            <tr>
              <td class="checklist-grid-uraian">
                <p>${item.no !== undefined && item.no !== null ? `<span class="checklist-grid-no">${item.no}.</span>` : ""}${item.uraian}</p>
                ${item.standar ? `<p class="checklist-grid-standar">Standar: ${item.standar}</p>` : ""}
              </td>
              ${gridColumns.map((col, colIdx) => `
                <td class="checklist-grid-cell-wrap${butuhNilaiAktual(item) ? "" : " checklist-grid-cell-wrap--okno"}">
                  ${butuhNilaiAktual(item)
                    ? `<input type="text" class="checklist-grid-cell" data-idx="${idx}" data-col="${colIdx}" aria-label="${item.uraian} - ${col}" />`
                    : oknoMarkup("checklist-okno--grid", `data-idx="${idx}" data-col="${colIdx}"`)}
                </td>
              `).join("")}
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  } else {
    itemsContainer.innerHTML = def.items.map((item, idx) => `
      <div class="checklist-row">
        <div class="checklist-row-head">
          <span class="checklist-row-no">${item.no}</span>
          <div>
            <p class="checklist-row-uraian">${item.uraian}</p>
            ${item.standar ? `<p class="checklist-row-standar">Standar: ${item.standar}</p>` : ""}
          </div>
        </div>
        <div class="checklist-row-inputs">
          ${butuhNilaiAktual(item)
            ? `<input type="text" class="checklist-hasil" data-idx="${idx}" placeholder="Hasil" />`
            : oknoMarkup("", `data-idx="${idx}"`)}
          <input type="text" class="checklist-keterangan" data-idx="${idx}" placeholder="Keterangan" />
        </div>
      </div>
    `).join("");
  }

  function clearFormError() {
    formError.hidden = true;
    formError.textContent = "";
  }

  function showFormError(msg) {
    formError.hidden = false;
    formError.textContent = msg;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearFormError();

    if (!inputEquipment.value.trim()) {
      showFormError("Isi dulu Equipment-nya.");
      return;
    }
    if (!inputTanggal.value) {
      showFormError(`Isi dulu ${labelTanggal.textContent}.`);
      return;
    }
    if (!selectOpr.value) {
      showFormError("Pilih dulu Checked By (Operator)-nya.");
      return;
    }

    let items;
    if (isGrid) {
      const perItemValues = def.items.map(() => ({}));
      itemsContainer.querySelectorAll(".checklist-grid-cell").forEach((cell) => {
        const idx = Number(cell.dataset.idx);
        const colIdx = Number(cell.dataset.col);
        perItemValues[idx][gridColumns[colIdx]] = cell.value.trim();
      });
      // Item OK/NO di grid: baca dataset.value grup-nya.
      itemsContainer.querySelectorAll(".checklist-okno--grid").forEach((group) => {
        const idx = Number(group.dataset.idx);
        const colIdx = Number(group.dataset.col);
        perItemValues[idx][gridColumns[colIdx]] = group.dataset.value || "";
      });
      items = def.items.map((item, idx) => ({
        no: item.no,
        uraian: item.uraian,
        standar: item.standar,
        values: perItemValues[idx],
      }));
    } else {
      const keteranganInputs = itemsContainer.querySelectorAll(".checklist-keterangan");
      items = def.items.map((item, idx) => {
        const hasilInput = itemsContainer.querySelector(`.checklist-hasil[data-idx="${idx}"]`);
        const hasilGroup = itemsContainer.querySelector(`.checklist-row-inputs > .checklist-okno[data-idx="${idx}"]`);
        const hasil = hasilInput ? hasilInput.value.trim() : (hasilGroup ? (hasilGroup.dataset.value || "") : "");
        return {
          no: item.no,
          uraian: item.uraian,
          standar: item.standar,
          hasil,
          keterangan: keteranganInputs[idx].value.trim(),
        };
      });
    }

    btnSubmit.disabled = true;
    btnSubmit.querySelector(".btn-submit-label").textContent = "Menyimpan…";

    try {
      const { data: inserted, error } = await supabase
        .from("production_checklist_submission")
        .insert({
          checklist_key: def.id,
          checklist_title: def.title,
          category_label: def.categoryLabel,
          periode_label: def.periodeLabel,
          equipment: inputEquipment.value.trim(),
          area: inputArea.value.trim(),
          bulan_tahun: inputBulanTahun.value.trim(),
          items,
          tanggal_inspeksi: inputTanggal.value,
          checked_by_opr: oprKaryawanNama(),
          catatan: inputCatatan.value.trim(),
        })
        .select("id")
        .single();

      if (error) throw error;

      if (selectedFiles.length > 0) {
        const fotoUrls = await Promise.all(selectedFiles.map((item) => uploadPhoto(item.file)));
        const { error: fotoError } = await supabase
          .from("production_checklist_foto")
          .insert(fotoUrls.map((url) => ({ submission_id: inserted.id, foto_url: url })));
        if (fotoError) throw fotoError;
      }

      kirimNotifikasiSpv({
        tipe: "production_checklist",
        refId: inserted.id,
        judul: `Production baru: ${def.title}`,
        pesan: `${inputEquipment.value.trim()} · ${def.periodeLabel} · ${inputTanggal.value}`,
      });

      successOverlay.hidden = false;
    } catch (err) {
      console.error(err);
      showFormError("Gagal menyimpan checklist. Coba lagi. (" + (err.message || "unknown error") + ")");
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.querySelector(".btn-submit-label").textContent = "Simpan checklist";
    }
  });

  btnNewChecklist.addEventListener("click", () => {
    form.reset();
    inputPeriode.value = def.periodeLabel;
    const t = new Date();
    inputTanggal.value = `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
    selectedFiles = [];
    renderPhotoGrid();
    // form.reset() cuma reset input/select bawaan, tombol OK/NO custom
    // harus dikosongkan manual.
    itemsContainer.querySelectorAll(".checklist-okno").forEach((group) => {
      delete group.dataset.value;
      group.querySelectorAll(".okno-btn").forEach((b) => b.classList.remove("is-active"));
    });
    successOverlay.hidden = true;
  });
}
