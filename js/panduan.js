// ---------- PANDUAN (file attachment per form) ----------
// Modul reusable dipakai di 4 halaman form input: laporan.html
// (form_key "reports"), checklist.html ("utility"),
// production-checklist.html ("production"), dan
// lubrication-checklist.html ("lubrication").
//
// Menampilkan daftar file panduan (PDF/gambar/dokumen apa saja) di
// atas form, supaya operator bisa lihat/download sebelum isi form.
// Cuma role superadmin & hod_engineering yang lihat tombol
// tambah/ubah/hapus (CRUD) — operator & SPV cuma bisa lihat/download.
//
// Cara pakai: taruh <div id="panduan-box" data-panduan-form="utility"
// data-panduan-label="Checklist PM Utility" hidden></div> di HTML
// halaman terkait, lalu <script type="module" src="js/panduan.js">.
// Modul ini otomatis jalan sendiri (self-init), tidak perlu dipanggil
// manual dari js lain.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
import { getSession } from "./auth.js";
import { logAudit } from "./audit.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const BUCKET = "panduan-form";
const MANAGE_ROLES = ["superadmin", "hod_engineering"];
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function formatSize(bytes) {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function sanitizeFileName(name) {
  return (name || "file").replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function init() {
  const box = document.getElementById("panduan-box");
  if (!box) return;

  const session = getSession();
  if (!session) return;

  const formKey = box.dataset.panduanForm;
  if (!formKey) return;
  const formLabel = box.dataset.panduanLabel || "form ini";

  const canManage = (session.roles || []).some((r) => MANAGE_ROLES.includes(r));

  box.hidden = false;
  box.innerHTML = `
    <div class="panduan-box">
      <div class="panduan-head">
        <p class="panduan-title">📎 Panduan pengisian ${escapeHtml(formLabel)}</p>
        ${canManage ? `<button type="button" class="panduan-add-btn" id="panduan-add-btn">+ Tambah Panduan</button>` : ""}
      </div>
      <div class="panduan-list" id="panduan-list">
        <p class="panduan-empty">Memuat panduan…</p>
      </div>
    </div>

    <div class="pm-detail-overlay" id="panduan-form-overlay" hidden>
      <div class="pm-detail-card reject-modal-card">
        <button type="button" class="pm-detail-close" id="panduan-form-close" aria-label="Tutup">&times;</button>
        <p class="pm-detail-title" id="panduan-form-title">Tambah Panduan</p>
        <p class="pm-detail-sub">File akan tampil ke semua operator yang buka ${escapeHtml(formLabel)}.</p>
        <form id="panduan-form">
          <label class="field-label" for="pf-judul">Judul panduan</label>
          <input type="text" id="pf-judul" class="gate-input" placeholder="mis. SOP Pengisian Checklist" autocomplete="off" required />

          <label class="field-label" for="pf-file" id="pf-file-label">File</label>
          <input type="file" id="pf-file" class="gate-input" />
          <p class="panduan-file-hint" id="pf-file-hint"></p>

          <p class="field-error" id="panduan-form-error" hidden></p>
          <button type="submit" class="btn-submit" id="panduan-form-submit">Simpan</button>
        </form>
      </div>
    </div>
  `;

  const listEl = document.getElementById("panduan-list");
  const addBtn = document.getElementById("panduan-add-btn");
  const overlay = document.getElementById("panduan-form-overlay");
  const closeBtn = document.getElementById("panduan-form-close");
  const form = document.getElementById("panduan-form");
  const titleEl = document.getElementById("panduan-form-title");
  const judulInput = document.getElementById("pf-judul");
  const fileInput = document.getElementById("pf-file");
  const fileLabel = document.getElementById("pf-file-label");
  const fileHint = document.getElementById("pf-file-hint");
  const formError = document.getElementById("panduan-form-error");
  const submitBtn = document.getElementById("panduan-form-submit");

  let items = [];
  let editingId = null; // null = mode tambah

  async function loadList() {
    const { data, error } = await supabase
      .from("form_panduan")
      .select("id, judul, file_name, file_path, file_url, file_size, uploaded_by_nama, created_at")
      .eq("form_key", formKey)
      .order("created_at", { ascending: true });

    if (error) {
      console.error(error);
      listEl.innerHTML = `<p class="panduan-empty">Gagal memuat panduan.</p>`;
      return;
    }

    items = data || [];
    renderList();
  }

  function renderList() {
    if (items.length === 0) {
      listEl.innerHTML = `<p class="panduan-empty">Belum ada panduan untuk form ini.</p>`;
      return;
    }

    listEl.innerHTML = items
      .map(
        (item) => `
      <div class="panduan-item" data-id="${item.id}">
        <span class="panduan-item-icon">📄</span>
        <a class="panduan-item-name" href="${item.file_url}" target="_blank" rel="noopener">
          ${escapeHtml(item.judul)}
          <span class="panduan-item-meta">${escapeHtml(item.file_name)}${item.file_size ? " · " + formatSize(item.file_size) : ""}</span>
        </a>
        ${
          canManage
            ? `
        <div class="panduan-item-actions">
          <button type="button" class="panduan-item-btn edit" data-action="edit" data-id="${item.id}">Ubah</button>
          <button type="button" class="panduan-item-btn delete" data-action="delete" data-id="${item.id}">Hapus</button>
        </div>`
            : ""
        }
      </div>
    `
      )
      .join("");
  }

  function openModal(mode, item) {
    formError.hidden = true;
    form.reset();
    if (mode === "edit" && item) {
      editingId = item.id;
      titleEl.textContent = "Ubah Panduan";
      judulInput.value = item.judul;
      fileLabel.textContent = "Ganti file (opsional)";
      fileHint.textContent = `File saat ini: ${item.file_name}. Kosongkan kalau tidak mau ganti file.`;
      fileInput.required = false;
    } else {
      editingId = null;
      titleEl.textContent = "Tambah Panduan";
      fileLabel.textContent = "File";
      fileHint.textContent = "";
      fileInput.required = true;
    }
    overlay.hidden = false;
  }

  function closeModal() {
    overlay.hidden = true;
    editingId = null;
  }

  async function uploadFile(file) {
    const safeName = sanitizeFileName(file.name);
    const path = `${formKey}/${crypto.randomUUID()}-${safeName}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (error) throw error;
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return { path, url: data.publicUrl };
  }

  async function deleteFileFromStorage(path) {
    if (!path) return;
    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) console.warn("Gagal hapus file lama di storage:", error);
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    formError.hidden = true;

    const judul = judulInput.value.trim();
    if (!judul) {
      formError.textContent = "Judul panduan wajib diisi.";
      formError.hidden = false;
      return;
    }

    const file = fileInput.files[0] || null;
    if (!editingId && !file) {
      formError.textContent = "Pilih file panduan.";
      formError.hidden = false;
      return;
    }
    if (file && file.size > MAX_FILE_SIZE) {
      formError.textContent = "Ukuran file maksimal 25 MB.";
      formError.hidden = false;
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Menyimpan…";

    try {
      if (editingId) {
        const current = items.find((it) => it.id === editingId);
        const updateRow = { judul, updated_at: new Date().toISOString() };

        if (file) {
          const uploaded = await uploadFile(file);
          updateRow.file_name = file.name;
          updateRow.file_path = uploaded.path;
          updateRow.file_url = uploaded.url;
          updateRow.file_size = file.size;
        }

        const { error } = await supabase.from("form_panduan").update(updateRow).eq("id", editingId);
        if (error) throw error;

        if (file && current?.file_path) {
          await deleteFileFromStorage(current.file_path);
        }

        logAudit(supabase, {
          actorId: session.userId,
          actorUsername: session.username,
          actorNama: session.nama,
          actorRole: session.role,
          action: "panduan_ubah",
          entityType: "form_panduan",
          entityId: editingId,
          entityLabel: judul,
          detail: `Form: ${formLabel}`,
        });
      } else {
        const uploaded = await uploadFile(file);
        const { data: inserted, error } = await supabase
          .from("form_panduan")
          .insert({
            form_key: formKey,
            judul,
            file_name: file.name,
            file_path: uploaded.path,
            file_url: uploaded.url,
            file_size: file.size,
            uploaded_by_id: session.userId,
            uploaded_by_nama: session.nama || session.username,
          })
          .select("id")
          .single();
        if (error) throw error;

        logAudit(supabase, {
          actorId: session.userId,
          actorUsername: session.username,
          actorNama: session.nama,
          actorRole: session.role,
          action: "panduan_tambah",
          entityType: "form_panduan",
          entityId: inserted?.id,
          entityLabel: judul,
          detail: `Form: ${formLabel}`,
        });
      }

      closeModal();
      await loadList();
    } catch (err) {
      console.error(err);
      formError.textContent = "Gagal menyimpan panduan. Coba lagi.";
      formError.hidden = false;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Simpan";
    }
  });

  listEl.addEventListener("click", async (e) => {
    const btn = e.target.closest(".panduan-item-btn");
    if (!btn) return;
    const id = btn.dataset.id;
    const item = items.find((it) => it.id === id);
    if (!item) return;

    if (btn.dataset.action === "edit") {
      openModal("edit", item);
      return;
    }

    if (btn.dataset.action === "delete") {
      const ok = confirm(`Hapus panduan "${item.judul}"? File tidak bisa dikembalikan lagi.`);
      if (!ok) return;

      const { error } = await supabase.from("form_panduan").delete().eq("id", id);
      if (error) {
        console.error(error);
        alert("Gagal menghapus panduan. Coba lagi.");
        return;
      }
      await deleteFileFromStorage(item.file_path);

      logAudit(supabase, {
        actorId: session.userId,
        actorUsername: session.username,
        actorNama: session.nama,
        actorRole: session.role,
        action: "panduan_hapus",
        entityType: "form_panduan",
        entityId: id,
        entityLabel: item.judul,
        detail: `Form: ${formLabel}`,
      });

      await loadList();
    }
  });

  if (canManage) {
    addBtn.addEventListener("click", () => openModal("add"));
  }
  closeBtn.addEventListener("click", closeModal);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });

  await loadList();
}

init();
