// Service worker — cache "app shell" (HTML/CSS/JS/assets) supaya app
// kebuka cepat & tetap kebuka meski sinyal lemot/hilang sebentar.
//
// CATATAN PENTING: data (laporan, checklist, rekap, login, dll) tetap
// butuh koneksi internet karena disimpan di Supabase. Service worker
// ini TIDAK bikin isi form/kirim data bisa offline — itu perlu queue
// terpisah (IndexedDB) yang belum dibuat. Yang di-cache cuma tampilan
// (shell) appnya, bukan datanya.

const CACHE_VERSION = "skr-mtc-v13";
const APP_SHELL = [
  "./index.html",
  "./dashboard.html",
  "./trend.html",
  "./qrcode.html",
  "./riwayat-mesin.html",
  "./laporan.html",
  "./rekap.html",
  "./pm.html",
  "./checklist.html",
  "./rekap-pm.html",
  "./production.html",
  "./production-checklist.html",
  "./rekap-production.html",
  "./lubrication.html",
  "./lubrication-checklist.html",
  "./draft.html",
  "./kelola-user.html",
  "./online.html",
  "./bersihkan-data.html",
  "./audit-log.html",
  "./css/style.css",
  "./js/config.js",
  "./js/i18n.js",
  "./js/auth.js",
  "./js/audit.js",
  "./js/login.js",
  "./js/sidebar.js",
  "./js/dashboard.js",
  "./js/trend.js",
  "./js/qrcode-page.js",
  "./js/riwayat-mesin.js",
  "./js/app.js",
  "./js/checklist.js",
  "./js/checklist-data.js",
  "./js/pm.js",
  "./js/production.js",
  "./js/production-checklist.js",
  "./js/production-data.js",
  "./js/lubrication.js",
  "./js/lubrication-checklist.js",
  "./js/lubrication-data.js",
  "./js/rekap-lubrication.js",
  "./js/lubrication-tabs.js",
  "./js/rekap.js",
  "./js/rekap-pm.js",
  "./js/rekap-production.js",
  "./js/draft.js",
  "./js/kelola-user.js",
  "./js/online.js",
  "./js/bersihkan-data.js",
  "./js/audit-log.js",
  "./js/notify.js",
  "./js/image-compress.js",
  "./js/report-tabs.js",
  "./js/production-tabs.js",
  "./js/utility-tabs.js",
  "./assets/logo.png",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./manifest.webmanifest",
  "./offline.html",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_VERSION)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Cuma tangani GET, biarkan request lain (POST ke Supabase dll) lewat apa adanya.
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Jangan cache/campur tangan request ke domain lain (Supabase, Google Fonts, esm.sh, dll).
  // Biarkan browser yang urus langsung supaya data selalu fresh & auth tetap aman.
  if (url.origin !== self.location.origin) return;

  // Halaman HTML: coba jaringan dulu (biar update kepakai), fallback ke cache/offline kalau gagal.
  if (req.mode === "navigate" || req.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, resClone));
          return res;
        })
        .catch(() =>
          caches.match(req).then((cached) => cached || caches.match("./offline.html"))
        )
    );
    return;
  }

  // Aset statis (css/js/gambar/manifest): cache-first, update di background.
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, resClone));
          return res;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
