import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Dipanggil setelah laporan/checklist PM berhasil disimpan sebagai draft,
// supaya muncul di lonceng notifikasi & halaman draft.html punya SPV.
// Gagal kirim notifikasi tidak menggagalkan submit (cuma di-log).
export async function kirimNotifikasiSpv({ tipe, refId, judul, pesan }) {
  try {
    const { error } = await supabase.from("notifikasi").insert({
      tipe,
      ref_id: refId,
      judul,
      pesan,
    });
    if (error) console.error("Gagal kirim notifikasi ke SPV:", error);
  } catch (err) {
    console.error("Gagal kirim notifikasi ke SPV:", err);
  }
}
