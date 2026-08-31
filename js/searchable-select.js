// ============================================================
// Searchable select — tempel di depan <select> yang isinya banyak
// (misal daftar operator/PIC ratusan orang) supaya bisa DIKETIK buat
// nyari, bukan cuma scroll manual / native jump-to-letter yang browser
// sediakan bawaan.
//
// CARA PAKAI: tambahin atribut `data-searchable` (dan opsional
// `data-placeholder="Cari nama…"`) di tag <select> di HTML. Script ini
// otomatis jalan ke semua <select data-searchable> begitu halaman
// dimuat — TIDAK perlu ubah kode yang sudah ada yang mengisi/membaca
// select itu (loadKaryawan dkk tetap innerHTML/appendChild/.value
// seperti biasa), karena <select> aslinya tetap ada di belakang layar
// (cuma disembunyikan secara visual), cuma dipantau isinya lewat
// MutationObserver biar tampilan pencarian ikut update otomatis pas
// data operator selesai dimuat dari Supabase.
// ============================================================

function enhanceSearchableSelect(select) {
  if (select.dataset.ssEnhanced === "true") return;
  select.dataset.ssEnhanced = "true";

  const wrap = document.createElement("div");
  wrap.className = "ss-wrap";

  const input = document.createElement("input");
  input.type = "text";
  input.className = "ss-input";
  input.autocomplete = "off";
  input.spellcheck = false;

  const list = document.createElement("div");
  list.className = "ss-list";
  list.hidden = true;

  wrap.appendChild(input);
  wrap.appendChild(list);
  select.insertAdjacentElement("afterend", wrap);
  select.hidden = true; // select asli tetap "hidup" di form, cuma disembunyikan visual

  const basePlaceholder = select.dataset.placeholder || "Ketik untuk cari…";
  let items = []; // {value, text, disabled}
  let activeIndex = -1;

  function readItemsFromSelect() {
    items = Array.from(select.options).map((o) => ({
      value: o.value,
      text: o.textContent,
      disabled: o.disabled,
    }));
  }

  function selectedText() {
    const selected = items.find((it) => it.value === select.value && !it.disabled);
    return selected ? selected.text : "";
  }

  function syncInputFromSelect() {
    readItemsFromSelect();
    const selected = items.find((it) => it.value === select.value && !it.disabled);
    const onlyDisabled = items.length > 0 && items.every((it) => it.disabled);

    if (selected) {
      input.value = selected.text;
      input.disabled = false;
      input.placeholder = basePlaceholder;
    } else if (onlyDisabled) {
      // contoh: select cuma berisi "Memuat data operator…" atau
      // "Gagal memuat data operator" — kunci input, tampilkan sebagai
      // placeholder abu-abu supaya jelas belum siap dipakai.
      input.value = "";
      input.placeholder = items[0].text;
      input.disabled = true;
    } else {
      input.value = "";
      input.placeholder = basePlaceholder;
      input.disabled = false;
    }
  }

  function renderList(filterText) {
    const q = (filterText || "").trim().toLowerCase();
    const selectable = items.filter((it) => !it.disabled);
    const filtered = q ? selectable.filter((it) => it.text.toLowerCase().includes(q)) : selectable;

    activeIndex = -1;
    if (filtered.length === 0) {
      list.innerHTML = `<div class="ss-empty">Tidak ditemukan</div>`;
      return;
    }
    list.innerHTML = filtered
      .map((it) => `<div class="ss-option" data-value="${escapeAttr(it.value)}">${escapeHtml(it.text)}</div>`)
      .join("");
  }

  function openList() {
    if (input.disabled) return;
    // kalau teks di kotak masih sama dengan pilihan yang aktif (belum
    // diketik ulang), tampilkan SEMUA opsi biar tetap bisa di-scroll
    // cari manual tanpa harus ngetik dulu.
    renderList(input.value === selectedText() ? "" : input.value);
    list.hidden = false;
    wrap.classList.add("ss-open");
  }

  function closeList() {
    list.hidden = true;
    wrap.classList.remove("ss-open");
    activeIndex = -1;
  }

  function choose(value) {
    const item = items.find((it) => it.value === value);
    if (!item) return;
    select.value = value;
    input.value = item.text;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    closeList();
  }

  function highlightActive() {
    const options = list.querySelectorAll(".ss-option");
    options.forEach((o, i) => o.classList.toggle("ss-option--active", i === activeIndex));
    if (activeIndex >= 0) options[activeIndex]?.scrollIntoView({ block: "nearest" });
  }

  input.addEventListener("focus", openList);

  input.addEventListener("input", () => {
    renderList(input.value);
    list.hidden = false;
    wrap.classList.add("ss-open");
    // Kalau teksnya diketik ulang dan sudah beda dari nama yang lagi
    // kepilih, kosongkan value select-nya dulu — supaya validasi form
    // nggak lolos cuma karena orang ngetik nama tanpa benar-benar
    // milih dari daftar (mencegah salah pilih/typo lolos submit).
    if (input.value !== selectedText()) {
      select.value = "";
    }
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (list.hidden) return openList();
      const count = list.querySelectorAll(".ss-option").length;
      activeIndex = Math.min(activeIndex + 1, count - 1);
      highlightActive();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
      highlightActive();
    } else if (e.key === "Enter") {
      e.preventDefault();
      const options = list.querySelectorAll(".ss-option");
      const target = activeIndex >= 0 ? options[activeIndex] : options[0];
      if (target) choose(target.dataset.value);
    } else if (e.key === "Escape") {
      closeList();
    }
  });

  // mousedown (bukan click) supaya nggak keburu ke-cancel sama event
  // blur di input saat opsi di-tap/klik.
  list.addEventListener("mousedown", (e) => {
    const opt = e.target.closest(".ss-option");
    if (!opt) return;
    e.preventDefault();
    choose(opt.dataset.value);
  });

  document.addEventListener("click", (e) => {
    if (!wrap.contains(e.target)) closeList();
  });

  // select aslinya diisi ULANG secara async oleh kode yang sudah ada
  // (loadKaryawan, dsb, setelah fetch ke Supabase selesai) — pantau
  // biar input & daftar pencarian ikut ke-update otomatis.
  const observer = new MutationObserver(syncInputFromSelect);
  observer.observe(select, { childList: true });

  // form.reset() cuma me-reset <select> aslinya, tampilan input custom
  // harus disamakan manual sesudahnya.
  select.closest("form")?.addEventListener("reset", () => {
    setTimeout(syncInputFromSelect, 0);
  });

  syncInputFromSelect();
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, "&quot;");
}

function initSearchableSelects() {
  document.querySelectorAll("select[data-searchable]").forEach(enhanceSearchableSelect);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSearchableSelects);
} else {
  initSearchableSelects();
}
