// ---------- IMAGE COMPRESS ----------
// Kompres foto di browser sebelum diupload ke Supabase Storage.
// Foto dari HP (kamera) biasanya 3-8MB; setelah resize + re-encode
// biasanya turun ke ratusan KB tanpa keliatan bedanya di layar HP.

const MAX_DIMENSION = 1600; // px, sisi terpanjang
const JPEG_QUALITY = 0.75; // 0-1

/**
 * Kompres 1 file gambar. Kalau file bukan gambar (atau gagal diproses),
 * balikin file aslinya apa adanya supaya upload tetap jalan.
 * @param {File} file
 * @returns {Promise<File>}
 */
export async function compressImage(file) {
  if (!file.type.startsWith("image/")) return file;

  try {
    const bitmap = await createImageBitmap(file);

    let { width, height } = bitmap;
    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      const scale = MAX_DIMENSION / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
    );

    if (!blob) return file; // toBlob gagal, fallback ke file asli

    // Kalau hasil kompres malah lebih gede dari aslinya (jarang, tapi
    // bisa kejadian buat gambar kecil/simple), pakai yang asli aja.
    if (blob.size >= file.size) return file;

    const newName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], newName, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch (err) {
    console.warn("Gagal kompres foto, pakai file asli:", err);
    return file;
  }
}

/**
 * Kompres banyak file sekaligus secara paralel.
 * @param {FileList|File[]} files
 * @returns {Promise<File[]>}
 */
export async function compressImages(files) {
  return Promise.all(Array.from(files).map(compressImage));
}

// ---------- TIMESTAMP WATERMARK ----------
// Dipakai KHUSUS foto per titik lubrikasi (bukan foto evidence
// PM/Production yang lain) — cap tanggal & jam digambar langsung ke
// pixel foto (bukan cuma metadata EXIF), jadi kelihatan di layar mana
// pun foto itu dibuka nanti.

const STAMP_JPEG_QUALITY = 0.85; // source-nya udah dikompres compressImage, jadi kualitas re-encode boleh lebih tinggi

/**
 * Gambar cap tanggal+jam (dan label opsional, misal "Line 4 · Top
 * Cooker Rotor") di pojok kanan bawah foto. Kalau file bukan gambar
 * (atau gagal diproses), balikin file aslinya apa adanya.
 * @param {File} file
 * @param {string} [label] baris teks tambahan di atas timestamp
 * @returns {Promise<File>}
 */
export async function stampTimestamp(file, label) {
  if (!file.type.startsWith("image/")) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0, width, height);

    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const dateStr = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const lines = label ? [label, `${dateStr}  ${timeStr}`] : [`${dateStr}  ${timeStr}`];

    const fontSize = Math.max(16, Math.round(width * 0.026));
    const paddingX = Math.round(fontSize * 0.7);
    const paddingY = Math.round(fontSize * 0.55);
    const lineGap = Math.round(fontSize * 0.35);

    ctx.font = `600 ${fontSize}px Arial, Helvetica, sans-serif`;
    ctx.textBaseline = "alphabetic";

    const lineWidths = lines.map((line) => ctx.measureText(line).width);
    const boxWidth = Math.max(...lineWidths) + paddingX * 2;
    const boxHeight = lines.length * fontSize + (lines.length - 1) * lineGap + paddingY * 2;

    const margin = Math.round(fontSize * 0.5);
    const boxX = width - boxWidth - margin;
    const boxY = height - boxHeight - margin;

    ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
    drawRoundedRect(ctx, boxX, boxY, boxWidth, boxHeight, 6);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    let baseline = boxY + paddingY + fontSize * 0.78;
    for (const line of lines) {
      ctx.fillText(line, boxX + paddingX, baseline);
      baseline += fontSize + lineGap;
    }

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", STAMP_JPEG_QUALITY)
    );
    if (!blob) return file;

    const newName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], newName, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch (err) {
    console.warn("Gagal menambahkan timestamp ke foto, pakai file asli:", err);
    return file;
  }
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}
