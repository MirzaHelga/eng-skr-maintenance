import { getRole, setSession, loginWithUsername, DEFAULT_PAGE } from "./auth.js";

const form = document.getElementById("login-form");
const inputUsername = document.getElementById("input-username");
const inputPassword = document.getElementById("input-password");
const loginError = document.getElementById("login-error");
const submitBtn = form.querySelector('button[type="submit"]');

// Kalau sudah login (sesi masih ada), langsung lempar ke halaman awal role-nya.
const existingRole = getRole();
if (existingRole) {
  window.location.href = DEFAULT_PAGE[existingRole] || "dashboard.html";
}

const ATTEMPTS_KEY = "login-attempts";
const MAX_ATTEMPTS = 5;

function getAttempts() {
  return parseInt(sessionStorage.getItem(ATTEMPTS_KEY) || "0", 10);
}

function lockForm() {
  inputUsername.disabled = true;
  inputPassword.disabled = true;
  submitBtn.disabled = true;
  loginError.hidden = false;
  loginError.textContent = `Sudah ${MAX_ATTEMPTS}x salah. Muat ulang halaman ini untuk coba lagi.`;
}

if (getAttempts() >= MAX_ATTEMPTS) {
  lockForm();
}

const REASON_MESSAGE = {
  not_found: "Username tidak ditemukan.",
  wrong_password: "Password salah.",
  inactive: "Akun ini sudah dinonaktifkan. Hubungi Atasan anda.",
  error: "Gagal menghubungi server. Coba lagi.",
};

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.hidden = true;
  submitBtn.disabled = true;
  submitBtn.textContent = "Memeriksa…";

  const result = await loginWithUsername(inputUsername.value, inputPassword.value);

  submitBtn.disabled = false;
  submitBtn.textContent = "Masuk";

  if (result.ok) {
    sessionStorage.removeItem(ATTEMPTS_KEY);
    setSession(result.user);
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");
    window.location.href = next || DEFAULT_PAGE[result.user.role] || "dashboard.html";
    return;
  }

  // "not_found"/"inactive" tidak dihitung sebagai percobaan salah password,
  // supaya orang yang salah ketik username tidak kena lockout duluan.
  if (result.reason === "wrong_password") {
    const attempts = getAttempts() + 1;
    sessionStorage.setItem(ATTEMPTS_KEY, String(attempts));
    if (attempts >= MAX_ATTEMPTS) {
      lockForm();
      return;
    }
    loginError.hidden = false;
    loginError.textContent = `${REASON_MESSAGE.wrong_password} Sisa percobaan: ${MAX_ATTEMPTS - attempts}x.`;
  } else {
    loginError.hidden = false;
    loginError.textContent = REASON_MESSAGE[result.reason] || "Gagal masuk.";
  }

  inputPassword.value = "";
  inputPassword.focus();
});
