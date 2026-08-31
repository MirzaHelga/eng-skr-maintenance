import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
import { findLubricationLine, lubricationItemsForGroup, frekuensiGroupLabel } from "./lubrication-data.js";
import { kirimNotifikasiSpv } from "./notify.js";
import { compressImage, stampTimestamp } from "./image-compress.js";

// CATATAN: modul Lubrication ikut alur kerja yang SAMA PERSIS dengan
// Production — submit di sini tersimpan sebagai draft (review_status
// default 'draft'), lalu SPV/superadmin approve/reject di draft.html,
// baru muncul di tab "Rekap Lubrication" dengan status reviewnya.
//
// Setiap Line dipecah jadi beberapa checklist TERPISAH berdasarkan
// kategori frekuensi (Shiftly, Mingguan, Bulanan, 3 Bulan, 6 Bulan,
// Tahunan) — lihat lubrication.js untuk halaman pilih line+kategori.
// Halaman ini (?line=...&freq=...) cuma nampilin & nyimpen titik dari
// 1 line + 1 kategori sekaligus, jadi 1 form = 1 kategori, BUKAN 1 line
// utuh sekaligus 20-30 titik.
//
// FOTO EVIDENCE: beda dari modul PM/Production yang cuma punya 1 foto
// section per checklist, di sini tiap TITIK lubrikasi punya tombol foto
// sendiri (lihat rowMarkup + itemPhotos di bawah) — dan tiap foto yang
// diambil/diupload otomatis dicap tanggal & jam.

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const topbarTitle = document.getElementById("checklist-topbar-title");
const topbarSub = document.getElementById("checklist-topbar-sub");
const notFoundMsg = document.getElementById("checklist-not-found");
const card = document.getElementById("checklist-card");
const form = document.getElementById("form-checklist");

const inputBulanTahun = document.getElementById("input-bulan-tahun");
const inputTanggal = document.getElementById("input-tanggal");
const itemsContainer = document.getElementById("checklist-items");
const selectOpr = document.getElementById("select-opr");
const inputFotoCamera = document.getElementById("input-foto-camera");
const inputFotoGallery = document.getElementById("input-foto-gallery");
const inputCatatan = document.getElementById("input-catatan");
const formError = document.getElementById("form-error");
const btnSubmit = document.getElementById("btn-submit");
const successOverlay = document.getElementById("success-overlay");
const btnNewChecklist = document.getElementById("btn-new-checklist");

window.addEventListener("pageshow", () => {
  successOverlay.hidden = true;
});

// Departemen yang ditampilkan di dropdown Checked By (Operator) — sama
// dengan modul Production/PM.
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

// ---------- FOTO EVIDENCE PER TITIK ----------
// itemPhotos: idx (titik ke berapa di form ini) -> array of { id, file }.
// Tombol "Ambil foto"/"Upload foto" di tiap baris titik dipakaikan ke
// 2 hidden <input type="file"> yang sama (input-foto-camera/-gallery) —
// pendingPhotoIdx nentuin baris mana yang lagi diisi.
const itemPhotos = {};
let photoIdCounter = 0;
let pendingPhotoIdx = null;

async function addFilesToItem(idx, fileList) {
  const item = items[idx];
  const label = item ? `${lineDef.label} · ${item.titik}` : (lineDef ? lineDef.label : "");
  for (const file of Array.from(fileList)) {
    const compressed = await compressImage(file);
    const stamped = await stampTimestamp(compressed, label);
    if (!itemPhotos[idx]) itemPhotos[idx] = [];
    itemPhotos[idx].push({ id: ++photoIdCounter, file: stamped });
    renderItemPhotoGrid(idx);
  }
}

function removePhotoFromItem(idx, id) {
  itemPhotos[idx] = (itemPhotos[idx] || []).filter((p) => p.id !== id);
  renderItemPhotoGrid(idx);
}

function renderItemPhotoGrid(idx) {
  const grid = itemsContainer.querySelector(`.photo-preview-grid[data-preview-idx="${idx}"]`);
  if (!grid) return;
  grid.innerHTML = "";
  for (const photo of itemPhotos[idx] || []) {
    const cell = document.createElement("div");
    cell.className = "photo-cell";

    const img = document.createElement("img");
    img.alt = "Preview foto";
    const reader = new FileReader();
    reader.onload = (e) => { img.src = e.target.result; };
    reader.readAsDataURL(photo.file);

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "photo-cell-remove";
    removeBtn.setAttribute("aria-label", "Hapus foto");
    removeBtn.textContent = "✕";
    removeBtn.addEventListener("click", () => removePhotoFromItem(idx, photo.id));

    cell.appendChild(img);
    cell.appendChild(removeBtn);
    grid.appendChild(cell);
  }
}

// Tombol "Ambil foto" (kamera) cuma ditampilkan di HP.
const isMobileDevice = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

itemsContainer.addEventListener("click", (e) => {
  const camBtn = e.target.closest(".lube-photo-camera");
  const galBtn = e.target.closest(".lube-photo-gallery");
  if (!camBtn && !galBtn) return;
  const idx = (camBtn || galBtn).dataset.idx;
  pendingPhotoIdx = idx;
  (camBtn ? inputFotoCamera : inputFotoGallery).click();
});

inputFotoCamera.addEventListener("change", () => {
  if (pendingPhotoIdx !== null) addFilesToItem(pendingPhotoIdx, inputFotoCamera.files);
  inputFotoCamera.value = "";
});

inputFotoGallery.addEventListener("change", () => {
  if (pendingPhotoIdx !== null) addFilesToItem(pendingPhotoIdx, inputFotoGallery.files);
  inputFotoGallery.value = "";
});

async function uploadPhoto(file) {
  const ext = file.name.split(".").pop();
  const path = `lubrication-checklist/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("foto-lubrication-checklist").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("foto-lubrication-checklist").getPublicUrl(path);
  return data.publicUrl;
}

// Markup tombol Sudah/Belum per titik lubrikasi.
function doneMarkup(idx) {
  return `
    <div class="checklist-subfield">
      <span class="checklist-subfield-label">Status pengerjaan</span>
      <div class="checklist-okno" role="group" data-idx="${idx}">
        <button type="button" class="okno-btn okno-btn--ok" data-value="Sudah">Sudah</button>
        <button type="button" class="okno-btn okno-btn--no" data-value="Belum">Belum</button>
      </div>
    </div>
  `;
}

// Markup tombol Stop/Run per titik lubrikasi — kondisi mesin YANG
// SEBENARNYA saat titik itu dilumasi (beda dari item.statusMesin di
// data master yang cuma rekomendasi SOP — makanya baris "Status
// Mesin: ..." dihapus dari metaLine, biar nggak dobel/bingung).
function stopRunMarkup(idx) {
  return `
    <div class="checklist-subfield">
      <span class="checklist-subfield-label">Status mesin</span>
      <div class="checklist-stoprun" role="group" data-idx="${idx}">
        <button type="button" class="stoprun-btn stoprun-btn--stop" data-value="Stop">Stop</button>
        <button type="button" class="stoprun-btn stoprun-btn--run" data-value="Run">Run</button>
      </div>
    </div>
  `;
}

// Markup tombol foto + preview grid per titik lubrikasi.
function photoMarkup(idx) {
  return `
    <div class="lube-item-photo">
      <div class="photo-buttons photo-buttons--sm">
        <button type="button" class="photo-btn photo-btn--sm lube-photo-camera" data-idx="${idx}" ${isMobileDevice ? "" : "hidden"}>Ambil foto</button>
        <button type="button" class="photo-btn photo-btn--sm lube-photo-gallery" data-idx="${idx}">Upload foto</button>
      </div>
      <div class="photo-preview-grid photo-preview-grid--sm" data-preview-idx="${idx}"></div>
    </div>
  `;
}

itemsContainer.addEventListener("click", (e) => {
  const btn = e.target.closest(".okno-btn, .stoprun-btn");
  if (!btn) return;
  const group = btn.closest(".checklist-okno, .checklist-stoprun");
  group.querySelectorAll(".okno-btn, .stoprun-btn").forEach((b) => b.classList.remove("is-active"));
  btn.classList.add("is-active");
  group.dataset.value = btn.dataset.value;
});

const params = new URLSearchParams(window.location.search);
const lineKey = params.get("line");
const freqKey = params.get("freq");
const lineDef = lineKey ? findLubricationLine(lineKey) : null;
const items = lineDef && freqKey ? lubricationItemsForGroup(lineDef.key, freqKey) : [];

const backLink = document.querySelector(".pm-back-btn");

if (!lineDef || !freqKey || items.length === 0) {
  notFoundMsg.hidden = false;
} else {
  initChecklist(lineDef, freqKey, items);
}

function metaLine(item) {
  const parts = [];
  if (item.lubricant) parts.push(`Pelumas: ${item.lubricant}`);
  if (item.frekuensi) parts.push(`Frekuensi: ${item.frekuensi}`);
  if (item.metode) parts.push(`Metode: ${item.metode}`);
  if (item.estimasiQty) parts.push(`Estimasi: ${item.estimasiQty}`);
  return parts.join(" · ");
}

function initChecklist(line, freqKey, items) {
  card.hidden = false;
  const freqLabel = frekuensiGroupLabel(freqKey);
  topbarTitle.textContent = `Lubrication — ${line.label} · ${freqLabel}`;
  topbarSub.textContent = `${line.label} · Kategori ${freqLabel} · ${items.length} titik lubrikasi`;
  if (backLink) backLink.href = `lubrication.html?line=${encodeURIComponent(line.key)}`;

  const today = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  inputTanggal.value = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  itemsContainer.innerHTML = items.map((item, idx) => `
    <div class="checklist-row">
      <div class="checklist-row-head">
        <span class="checklist-row-no">${idx + 1}</span>
        <div>
          <p class="checklist-row-uraian">${escapeHtml(item.titik)}${item.critical ? ` <span class="lube-critical-badge">CRITICAL</span>` : ""}</p>
          ${metaLine(item) ? `<p class="checklist-row-standar">${escapeHtml(metaLine(item))}</p>` : ""}
        </div>
      </div>
      <div class="checklist-row-inputs">
        <div class="checklist-status-pair">
          ${doneMarkup(idx)}
          ${stopRunMarkup(idx)}
        </div>
        <input type="text" class="checklist-hasil lube-qty-aktual" data-idx="${idx}" placeholder="Qty terpakai (opsional)" />
        <input type="text" class="checklist-keterangan" data-idx="${idx}" placeholder="Keterangan (opsional)" />
      </div>
      ${photoMarkup(idx)}
    </div>
  `).join("");

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

    if (!inputTanggal.value) {
      showFormError("Isi dulu Tanggal Inspeksi.");
      return;
    }
    if (!selectOpr.value) {
      showFormError("Pilih dulu Checked By (Operator)-nya.");
      return;
    }

    const submittedItems = items.map((item, idx) => {
      const doneGroup = itemsContainer.querySelector(`.checklist-okno[data-idx="${idx}"]`);
      const stopRunGroup = itemsContainer.querySelector(`.checklist-stoprun[data-idx="${idx}"]`);
      const qtyInput = itemsContainer.querySelector(`.lube-qty-aktual[data-idx="${idx}"]`);
      const ketInput = itemsContainer.querySelector(`.checklist-keterangan[data-idx="${idx}"]`);
      return {
        no: item.no,
        titik: item.titik,
        lubricant: item.lubricant,
        frekuensi: item.frekuensi,
        statusMesin: item.statusMesin,
        metode: item.metode,
        estimasiQty: item.estimasiQty,
        critical: item.critical,
        dilakukan: doneGroup ? (doneGroup.dataset.value || "") : "",
        statusAktual: stopRunGroup ? (stopRunGroup.dataset.value || "") : "",
        qtyAktual: qtyInput ? qtyInput.value.trim() : "",
        keterangan: ketInput ? ketInput.value.trim() : "",
      };
    });

    btnSubmit.disabled = true;
    btnSubmit.querySelector(".btn-submit-label").textContent = "Menyimpan…";

    try {
      const { data: inserted, error } = await supabase
        .from("lubrication_checklist_submission")
        .insert({
          line_key: line.key,
          line_label: line.label,
          kategori_frekuensi: freqKey,
          kategori_frekuensi_label: freqLabel,
          bulan_tahun: inputBulanTahun.value.trim(),
          items: submittedItems,
          tanggal_inspeksi: inputTanggal.value,
          checked_by_opr: oprKaryawanNama(),
          catatan: inputCatatan.value.trim(),
        })
        .select("id")
        .single();

      if (error) throw error;

      // Upload foto per titik — tiap baris foto disimpan lengkap
      // dengan item_no & item_titik-nya masing-masing biar rekap tahu
      // foto itu punya titik yang mana (lihat sql/17_add_lubrication_foto_item.sql).
      const fotoRows = [];
      for (const idx of Object.keys(itemPhotos)) {
        const photos = itemPhotos[idx];
        if (!photos || photos.length === 0) continue;
        const item = items[idx];
        const urls = await Promise.all(photos.map((p) => uploadPhoto(p.file)));
        for (const url of urls) {
          fotoRows.push({
            submission_id: inserted.id,
            foto_url: url,
            item_no: item?.no ?? null,
            item_titik: item?.titik ?? null,
          });
        }
      }
      if (fotoRows.length > 0) {
        const { error: fotoError } = await supabase.from("lubrication_checklist_foto").insert(fotoRows);
        if (fotoError) throw fotoError;
      }

      kirimNotifikasiSpv({
        tipe: "lubrication_checklist",
        refId: inserted.id,
        judul: `Lubrication baru: ${line.label} · ${freqLabel}`,
        pesan: `${line.label} · ${freqLabel} · ${inputTanggal.value}`,
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
    const t = new Date();
    inputTanggal.value = `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
    // form.reset() cuma reset input/select bawaan, tombol Sudah/Belum
    // & Stop/Run & foto per titik dikelola manual di luar form state
    // jadi harus dikosongkan manual juga.
    for (const key of Object.keys(itemPhotos)) delete itemPhotos[key];
    itemsContainer.querySelectorAll(".photo-preview-grid").forEach((grid) => { grid.innerHTML = ""; });
    itemsContainer.querySelectorAll(".checklist-okno, .checklist-stoprun").forEach((group) => {
      delete group.dataset.value;
      group.querySelectorAll(".okno-btn, .stoprun-btn").forEach((b) => b.classList.remove("is-active"));
    });
    successOverlay.hidden = true;
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
