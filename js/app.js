import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
import { kirimNotifikasiSpv } from "./notify.js";
import { compressImage } from "./image-compress.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---------- ELEMENTS ----------
const form = document.getElementById("form-laporan");
const statusGrid = document.getElementById("status-grid");
const errStatus = document.getElementById("err-status");
const selectArea = document.getElementById("select-area");
const selectMesin = document.getElementById("select-mesin");
const selectEquipment = document.getElementById("select-equipment");
const inputTanggal = document.getElementById("input-tanggal");
const inputJamMulai = document.getElementById("input-jam-mulai");
const inputJamSelesai = document.getElementById("input-jam-selesai");
const errJam = document.getElementById("err-jam");
const selectShift = document.getElementById("select-shift");
const inputDeskripsi = document.getElementById("input-deskripsi");
const selectPic = document.getElementById("select-pic");
const inputFotoCamera = document.getElementById("input-foto-camera");
const inputFotoGallery = document.getElementById("input-foto-gallery");
const btnFotoCamera = document.getElementById("btn-foto-camera");
const btnFotoGallery = document.getElementById("btn-foto-gallery");
const photoPreviewGrid = document.getElementById("photo-preview-grid");
const formError = document.getElementById("form-error");
const btnSubmit = document.getElementById("btn-submit");
const successOverlay = document.getElementById("success-overlay");
const btnNewReport = document.getElementById("btn-new-report");

let selectedStatus = null;
let selectedFiles = []; // array of File, dari kamera maupun galeri (bisa gabungan)

// Paksa overlay sukses selalu tertutup tiap halaman ditampilkan —
// termasuk saat browser restore dari bfcache (reload/back-forward)
// yang bisa membuat overlay lama ikut ke-restore walau belum submit apapun.
window.addEventListener("pageshow", () => {
  successOverlay.hidden = true;
});

// master data cache: areas[], mesinByArea{area_id: [...]}, equipmentByMesin{mesin_id: [...]}
let areas = [];
let mesinList = [];
let equipmentList = [];
let karyawanList = [];

// ---------- DEFAULTS ----------
function setDefaultDateTime() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  inputTanggal.value = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const jamSekarang = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  inputJamMulai.value = jamSekarang;
  inputJamSelesai.value = jamSekarang;
}
setDefaultDateTime();

// ---------- STATUS CHIPS ----------
statusGrid.addEventListener("click", (e) => {
  const chip = e.target.closest(".status-chip");
  if (!chip) return;
  document.querySelectorAll(".status-chip").forEach((c) => c.classList.remove("selected"));
  chip.classList.add("selected");
  selectedStatus = chip.dataset.value;
  errStatus.hidden = true;
});

// Departemen yang ditampilkan di dropdown PIC. Tambah/ubah di sini kalau
// nanti mau melibatkan departemen lain.
const PIC_DEPARTEMEN = ["Engineering"];

// ---------- MASTER DATA ----------
async function loadMasterData() {
  const [areaRes, mesinRes, equipmentRes, karyawanRes] = await Promise.all([
    supabase.from("area").select("id, nama").order("nama"),
    supabase.from("mesin").select("id, area_id, nama").order("nama"),
    supabase.from("equipment").select("id, mesin_id, nama").order("nama"),
    supabase.from("karyawan").select("id, nama, departemen").in("departemen", PIC_DEPARTEMEN).order("nama"),
  ]);

  if (areaRes.error || mesinRes.error || equipmentRes.error || karyawanRes.error) {
    showFormError("Gagal memuat data master. Cek koneksi atau konfigurasi Supabase, lalu muat ulang halaman.");
    console.error(areaRes.error || mesinRes.error || equipmentRes.error || karyawanRes.error);
    return;
  }

  areas = areaRes.data;
  mesinList = mesinRes.data;
  equipmentList = equipmentRes.data;
  karyawanList = karyawanRes.data;

  fillSelect(selectArea, areas, "Pilih area");
  selectArea.disabled = false;

  fillSelect(selectPic, karyawanRes.data, "Pilih PIC");

  applyEquipmentFromQr();
}

// ---------- PRA-ISI DARI QR CODE ----------
// Kalau halaman dibuka lewat scan QR mesin (link berisi ?equipment=<id>),
// otomatis pilihkan area -> mesin -> equipment yang sesuai supaya
// operator tidak perlu cari manual dari 3 dropdown.
function applyEquipmentFromQr() {
  const params = new URLSearchParams(window.location.search);
  const equipmentId = params.get("equipment");
  if (!equipmentId) return;

  const equipment = equipmentList.find((e) => e.id === equipmentId);
  if (!equipment) {
    showFormError("Equipment dari QR ini tidak ditemukan (mungkin sudah dihapus/diganti). Silakan pilih manual.");
    return;
  }
  const mesin = mesinList.find((m) => m.id === equipment.mesin_id);
  if (!mesin) return;

  selectArea.value = mesin.area_id;
  selectArea.dispatchEvent(new Event("change"));

  selectMesin.value = mesin.id;
  selectMesin.dispatchEvent(new Event("change"));

  selectEquipment.value = equipment.id;


function fillSelect(selectEl, items, placeholder) {
  selectEl.innerHTML = "";
  const opt0 = document.createElement("option");
  opt0.value = "";
  opt0.textContent = placeholder;
  opt0.disabled = true;
  opt0.selected = true;
  selectEl.appendChild(opt0);

  for (const item of items) {
    const opt = document.createElement("option");
    opt.value = item.id;
    opt.textContent = item.nama;
    selectEl.appendChild(opt);
  }
}

selectArea.addEventListener("change", () => {
  const areaId = selectArea.value;
  const filtered = mesinList.filter((m) => m.area_id === areaId);
  fillSelect(selectMesin, filtered, "Pilih mesin");
  selectMesin.disabled = false;

  fillSelect(selectEquipment, [], "Pilih mesin dulu");
  selectEquipment.disabled = true;
});

selectMesin.addEventListener("change", () => {
  const mesinId = selectMesin.value;
  const filtered = equipmentList.filter((e) => e.mesin_id === mesinId);
  fillSelect(selectEquipment, filtered, "Pilih equipment");
  selectEquipment.disabled = false;
});

loadMasterData();

// ---------- PHOTO ----------

// tiap item: { id, file }. id dipakai supaya tombol hapus di grid tahu
// foto mana yang mau dibuang tanpa salah index kalau urutan berubah.
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

// Tombol "Ambil foto" (kamera) cuma ditampilkan di HP. Di PC/laptop
// cuma "Upload foto" (galeri/file explorer) yang relevan.
const isMobileDevice = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
if (isMobileDevice) {
  btnFotoCamera.hidden = false;
}

inputFotoCamera.addEventListener("change", () => {
  addFiles(inputFotoCamera.files);
  inputFotoCamera.value = ""; // supaya bisa ambil foto lagi berturut-turut
});

inputFotoGallery.addEventListener("change", () => {
  addFiles(inputFotoGallery.files);
  inputFotoGallery.value = ""; // supaya bisa pilih tambahan foto lagi
});

// ---------- SUBMIT ----------
function showFormError(msg) {
  formError.textContent = msg;
  formError.hidden = false;
}

function clearFormError() {
  formError.hidden = true;
  formError.textContent = "";
}

async function uploadPhoto(file) {
  const ext = file.name.split(".").pop();
  const path = `laporan/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("foto-laporan").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("foto-laporan").getPublicUrl(path);
  return data.publicUrl;
}

function validateForm() {
  const missing = [];
  errJam.hidden = true;

  if (!selectedStatus) {
    errStatus.hidden = false;
    missing.push("Status mesin");
  }
  if (!selectArea.value) missing.push("Area");
  if (!selectMesin.value) missing.push("Mesin");
  if (!selectEquipment.value) missing.push("Equipment");
  if (!inputTanggal.value) missing.push("Tanggal");
  if (!inputJamMulai.value) missing.push("Jam Mulai");
  if (!inputJamSelesai.value) missing.push("Jam Selesai");
  if (!selectShift.value) missing.push("Shift");
  if (!inputDeskripsi.value.trim()) missing.push("Deskripsi kejadian");
  if (!selectPic.value) missing.push("PIC");

  if (
    inputJamMulai.value &&
    inputJamSelesai.value &&
    inputJamSelesai.value < inputJamMulai.value
  ) {
    errJam.hidden = false;
    missing.push("Jam Selesai (tidak boleh sebelum Jam Mulai)");
  }

  return missing;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearFormError();

  const missing = validateForm();
  if (missing.length > 0) {
    showFormError("Lengkapi dulu field berikut: " + missing.join(", ") + ".");
    return;
  }

  btnSubmit.disabled = true;
  btnSubmit.querySelector(".btn-submit-label").textContent = "Mengirim…";

  try {
    const { data: inserted, error } = await supabase
      .from("laporan")
      .insert({
        area_id: selectArea.value,
        mesin_id: selectMesin.value,
        equipment_id: selectEquipment.value,
        tanggal: inputTanggal.value,
        jam_mulai: inputJamMulai.value,
        jam_selesai: inputJamSelesai.value,
        shift: selectShift.value,
        status: selectedStatus,
        deskripsi: inputDeskripsi.value.trim(),
        pic: picKaryawanNama(),
      })
      .select("id")
      .single();

    if (error) throw error;

    if (selectedFiles.length > 0) {
      const fotoUrls = await Promise.all(selectedFiles.map((item) => uploadPhoto(item.file)));
      const { error: fotoError } = await supabase
        .from("laporan_foto")
        .insert(fotoUrls.map((url) => ({ laporan_id: inserted.id, foto_url: url })));
      if (fotoError) throw fotoError;
    }

    kirimNotifikasiSpv({
      tipe: "laporan",
      refId: inserted.id,
      judul: `Laporan baru: ${picEquipmentNama()}`,
      pesan: `${selectedStatus} · ${selectShift.value} · ${inputTanggal.value}`,
    });

    successOverlay.hidden = false;
  } catch (err) {
    console.error(err);
    showFormError("Gagal mengirim laporan. Coba lagi. (" + (err.message || "unknown error") + ")");
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.querySelector(".btn-submit-label").textContent = "Kirim laporan";
  }
});

function picEquipmentNama() {
  return selectEquipment.selectedOptions[0]?.textContent || "Equipment";
}

function picKaryawanNama() {
  const picKaryawan = karyawanList.find((k) => k.id === selectPic.value);
  return picKaryawan ? picKaryawan.nama : "";
}

btnNewReport.addEventListener("click", () => {
  form.reset();
  selectedStatus = null;
  selectedFiles = [];
  document.querySelectorAll(".status-chip").forEach((c) => c.classList.remove("selected"));
  renderPhotoGrid();
  fillSelect(selectMesin, [], "Pilih area dulu");
  selectMesin.disabled = true;
  fillSelect(selectEquipment, [], "Pilih mesin dulu");
  selectEquipment.disabled = true;
  errJam.hidden = true;
  setDefaultDateTime();
  successOverlay.hidden = true;
});
