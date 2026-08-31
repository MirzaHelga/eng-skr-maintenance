// ============================================================
// ISI DUA VARIABEL INI DENGAN DATA PROJECT SUPABASE KAMU.
// Ambil dari: Supabase Dashboard > Project Settings > API
// ============================================================

export const SUPABASE_URL = "https://yprepomvjqflbxacwunm.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlwcmVwb212anFmbGJ4YWN3dW5tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxNDQ2NjAsImV4cCI6MjEwMzcyMDY2MH0.8oRwX44t5wpqmSXqgANA51VuGkNYmOZc6QQjwuQiQmw";

// ============================================================
// AKUN LOGIN
// Mulai versi ini, login TIDAK lagi pakai password bareng per role.
// Setiap orang punya akun sendiri (username + password), disimpan di
// tabel `app_user` (lihat sql/add_user_accounts.sql). Akun superadmin
// default: username "admin", password "admin123" — GANTI SEGERA
// setelah bisa login.
// ============================================================
