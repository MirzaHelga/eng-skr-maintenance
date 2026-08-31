import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
import { getSession, hashPassword, ROLE_LABEL } from "./auth.js";
import { logAudit } from "./audit.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const userCount = document.getElementById("user-count");
const userError = document.getElementById("user-error");
const userTbody = document.getElementById("user-tbody");
const btnTambah = document.getElementById("btn-tambah-user");

const formOverlay = document.getElementById("user-form-overlay");
const formClose = document.getElementById("user-form-close");
const formTitle = document.getElementById("user-form-title");
const formSub = document.getElementById("user-form-sub");
const form = document.getElementById("user-form");
const ufUsername = document.getElementById("uf-username");
const ufNama = document.getElementById("uf-nama");
const ufRole = document.getElementById("uf-role");
const ufPasswordWrap = document.getElementById("uf-password-wrap");
const ufPassword = document.getElementById("uf-password");
const formError = document.getElementById("user-form-error");
const formSubmit = document.getElementById("user-form-submit");

const resetOverlay = document.getElementById("reset-overlay");
const resetClose = document.getElementById("reset-close");
const resetTargetLabel = document.getElementById("reset-target-label");
const resetPassword = document.getElementById("reset-password");
const resetError = document.getElementById("reset-error");
const resetConfirm = document.getElementById("reset-confirm");

let editingId = null; // null = mode tambah, string = mode edit (id user)
let resettingId = null;
let resettingUsername = null;
let currentUsers = [];

const session = getSession();

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function actorFields() {
  return {
    actorId: session?.userId,
    actorUsername: session?.username,
    actorNama: session?.nama,
    actorRole: session?.role,
  };
}

function showError(msg) {
  userError.hidden = false;
  userError.textContent = msg;
}
function clearError() {
  userError.hidden = true;
  userError.textContent = "";
}

// ---------- MUAT DATA ----------
async function loadUsers() {
  clearError();
  userCount.textContent = "Memuat data…";
  userTbody.innerHTML = `<tr><td colspan="5" class="table-empty">Memuat data…</td></tr>`;

  const { data, error } = await supabase
    .from("app_user")
    .select("id, username, nama, role, is_active, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    console.error(error);
    showError(
      "Gagal memuat data user. Pastikan sql/add_user_accounts.sql sudah dijalankan di Supabase. (" +
        (error.message || "unknown error") +
        ")"
    );
    userCount.textContent = "";
    userTbody.innerHTML = "";
    return;
  }

  currentUsers = data || [];
  userCount.textContent = `${currentUsers.length} akun`;
  renderTable();
}

function renderTable() {
  if (currentUsers.length === 0) {
    userTbody.innerHTML = `<tr><td colspan="5" class="table-empty">Belum ada akun.</td></tr>`;
    return;
  }

  userTbody.innerHTML = "";
  for (const u of currentUsers) {
    const tr = document.createElement("tr");
    const isSelf = session && session.userId === u.id;
    tr.innerHTML = `
      <td>${escapeHtml(u.username)}${isSelf ? ' <span class="review-badge review-badge--draft">Kamu</span>' : ""}</td>
      <td>${escapeHtml(u.nama || "-")}</td>
      <td>${ROLE_LABEL[u.role] || u.role}</td>
      <td><span class="review-badge review-badge--${u.is_active ? "approved" : "rejected"}">${
      u.is_active ? "Aktif" : "Nonaktif"
    }</span></td>
      <td class="user-actions">
        <button type="button" class="btn-user-action btn-secondary btn-edit-user">Edit</button>
        <button type="button" class="btn-user-action btn-secondary btn-reset-user">Reset password</button>
        <button type="button" class="btn-user-action ${u.is_active ? "btn-toggle-off" : "btn-toggle-on"} btn-toggle-user">${
      u.is_active ? "Nonaktifkan" : "Aktifkan"
    }</button>
      </td>
    `;
    tr.querySelector(".btn-edit-user").addEventListener("click", () => openEditModal(u));
    tr.querySelector(".btn-reset-user").addEventListener("click", () => openResetModal(u));
    tr.querySelector(".btn-toggle-user").addEventListener("click", () => toggleActive(u));
    userTbody.appendChild(tr);
  }
}

// ---------- MODAL TAMBAH / EDIT ----------
function openAddModal() {
  editingId = null;
  formTitle.textContent = "Tambah User";
  formSub.textContent = "Isi data akun baru.";
  form.reset();
  ufRole.value = "operator_utility";
  ufPasswordWrap.hidden = false;
  ufPassword.required = true;
  formError.hidden = true;
  formOverlay.hidden = false;
  ufUsername.focus();
}

function openEditModal(u) {
  editingId = u.id;
  formTitle.textContent = "Edit User";
  formSub.textContent = "Ubah data akun. Password tidak diubah di sini — pakai tombol Reset password.";
  ufUsername.value = u.username;
  ufNama.value = u.nama || "";
  ufRole.value = u.role;
  ufPasswordWrap.hidden = true;
  ufPassword.required = false;
  ufPassword.value = "";
  formError.hidden = true;
  formOverlay.hidden = false;
  ufUsername.focus();
}

function closeFormModal() {
  formOverlay.hidden = true;
  editingId = null;
}

formClose.addEventListener("click", closeFormModal);
formOverlay.addEventListener("click", (e) => {
  if (e.target === formOverlay) closeFormModal();
});
btnTambah.addEventListener("click", openAddModal);

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  formError.hidden = true;

  const username = ufUsername.value.trim().toLowerCase();
  const nama = ufNama.value.trim();
  const role = ufRole.value;

  if (!username) {
    formError.hidden = false;
    formError.textContent = "Username wajib diisi.";
    return;
  }

  // Cegah superadmin ganti role akun sendiri jadi bukan superadmin
  // (biar tidak kekunci sendiri dari halaman ini).
  if (editingId && session && session.userId === editingId && role !== "superadmin") {
    formError.hidden = false;
    formError.textContent = "Kamu tidak bisa mengubah role akun sendiri jadi bukan Superadmin.";
    return;
  }

  formSubmit.disabled = true;
  formSubmit.textContent = "Menyimpan…";

  try {
    if (editingId) {
      const { error } = await supabase
        .from("app_user")
        .update({ username, nama, role, updated_at: new Date().toISOString() })
        .eq("id", editingId);
      if (error) throw error;

      logAudit(supabase, {
        ...actorFields(),
        action: "user_ubah",
        entityType: "app_user",
        entityId: editingId,
        entityLabel: username,
        detail: `Nama: ${nama || "-"} · Role: ${ROLE_LABEL[role] || role}`,
      });
    } else {
      const password = ufPassword.value;
      if (!password || password.length < 6) {
        formError.hidden = false;
        formError.textContent = "Password minimal 6 karakter.";
        return;
      }
      const password_hash = await hashPassword(password);
      const { data: inserted, error } = await supabase
        .from("app_user")
        .insert({ username, nama, role, password_hash })
        .select("id")
        .single();
      if (error) throw error;

      logAudit(supabase, {
        ...actorFields(),
        action: "user_tambah",
        entityType: "app_user",
        entityId: inserted?.id,
        entityLabel: username,
        detail: `Nama: ${nama || "-"} · Role: ${ROLE_LABEL[role] || role}`,
      });
    }

    closeFormModal();
    loadUsers();
  } catch (error) {
    console.error(error);
    const msg = (error.message || "").includes("duplicate")
      ? "Username sudah dipakai, pilih username lain."
      : "Gagal menyimpan akun. (" + (error.message || "unknown error") + ")";
    formError.hidden = false;
    formError.textContent = msg;
  } finally {
    formSubmit.disabled = false;
    formSubmit.textContent = "Simpan";
  }
});

// ---------- MODAL RESET PASSWORD ----------
function openResetModal(u) {
  resettingId = u.id;
  resettingUsername = u.username;
  resetTargetLabel.textContent = `${u.nama || u.username} (${u.username})`;
  resetPassword.value = "";
  resetError.hidden = true;
  resetOverlay.hidden = false;
  resetPassword.focus();
}

function closeResetModal() {
  resetOverlay.hidden = true;
  resettingId = null;
}

resetClose.addEventListener("click", closeResetModal);
resetOverlay.addEventListener("click", (e) => {
  if (e.target === resetOverlay) closeResetModal();
});

resetConfirm.addEventListener("click", async () => {
  if (!resettingId) return;
  const pw = resetPassword.value;
  if (!pw || pw.length < 6) {
    resetError.hidden = false;
    return;
  }

  resetConfirm.disabled = true;
  resetConfirm.textContent = "Menyimpan…";

  const password_hash = await hashPassword(pw);
  const { error } = await supabase
    .from("app_user")
    .update({ password_hash, updated_at: new Date().toISOString() })
    .eq("id", resettingId);

  resetConfirm.disabled = false;
  resetConfirm.textContent = "Simpan password baru";

  if (error) {
    console.error(error);
    showError("Gagal reset password. (" + (error.message || "unknown error") + ")");
    return;
  }

  logAudit(supabase, {
    ...actorFields(),
    action: "user_reset_password",
    entityType: "app_user",
    entityId: resettingId,
    entityLabel: resettingUsername,
  });

  closeResetModal();
});

// ---------- AKTIFKAN / NONAKTIFKAN ----------
async function toggleActive(u) {
  if (session && session.userId === u.id) {
    alert("Kamu tidak bisa menonaktifkan akun yang sedang kamu pakai sendiri.");
    return;
  }

  const nextActive = !u.is_active;
  const confirmMsg = nextActive
    ? `Aktifkan kembali akun "${u.username}"?`
    : `Nonaktifkan akun "${u.username}"? Akun ini tidak akan bisa login sampai diaktifkan lagi.`;
  if (!confirm(confirmMsg)) return;

  const { error } = await supabase
    .from("app_user")
    .update({ is_active: nextActive, updated_at: new Date().toISOString() })
    .eq("id", u.id);

  if (error) {
    console.error(error);
    showError("Gagal mengubah status akun. (" + (error.message || "unknown error") + ")");
    return;
  }

  logAudit(supabase, {
    ...actorFields(),
    action: nextActive ? "user_aktifkan" : "user_nonaktifkan",
    entityType: "app_user",
    entityId: u.id,
    entityLabel: u.username,
  });

  loadUsers();
}

loadUsers();
