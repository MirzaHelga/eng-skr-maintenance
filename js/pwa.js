// Daftarin service worker (app-shell caching + installable PWA).
// Aman dipanggil di semua halaman; kalau browser tidak dukung SW,
// diam-diam skip (tidak ganggu apa pun).
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch((err) => {
      console.warn("Service worker gagal didaftarkan:", err);
    });
  });
}
