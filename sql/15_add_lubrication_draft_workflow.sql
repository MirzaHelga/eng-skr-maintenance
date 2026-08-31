-- ============================================================
-- MODUL: Lubrication — ikut alur draft -> approve SPV -> rekap
-- Jalankan file ini di Supabase SQL Editor, SETELAH
-- sql/10_add_lubrication_checklist.sql.
--
-- PERUBAHAN KEBIJAKAN: sebelumnya modul Lubrication SENGAJA TANPA
-- alur draft/approval (lihat catatan di sql/10_add_lubrication_checklist.sql).
-- Sekarang diputuskan Lubrication ikut alur kerja yang SAMA PERSIS
-- dengan Production: operator isi checklist -> tersimpan sebagai
-- draft -> SPV/superadmin approve/reject di halaman draft.html ->
-- baru muncul (dengan status review) di tab "Rekap Lubrication" dan
-- bisa di-export ke Excel.
--
-- File ini AMAN dijalankan berkali-kali (idempotent).
-- ============================================================

-- ---------- KOLOM REVIEW DI lubrication_checklist_submission ----------
alter table public.lubrication_checklist_submission
  add column if not exists review_status text not null default 'draft'
    check (review_status in ('draft', 'approved', 'rejected'));

alter table public.lubrication_checklist_submission
  add column if not exists reviewed_by text;

alter table public.lubrication_checklist_submission
  add column if not exists reviewed_at timestamptz;

alter table public.lubrication_checklist_submission
  add column if not exists reject_reason text;

create index if not exists idx_lubrication_checklist_review_status
  on public.lubrication_checklist_submission(review_status);

-- ---------- IZIN UPDATE: supaya SPV/superadmin bisa approve/reject ----------
-- (sama seperti pm_checklist_submission & production_checklist_submission
-- di sql/08_add_draft_workflow.sql / sql/11_add_production_checklist.sql —
-- lihat catatan keamanan soal ini belum pakai Supabase Auth per-user).
drop policy if exists "lubrication checklist updatable by anyone" on public.lubrication_checklist_submission;
create policy "lubrication checklist updatable by anyone" on public.lubrication_checklist_submission
  for update using (true) with check (true);

-- ---------- NOTIFIKASI: izinkan tipe 'lubrication_checklist' ----------
-- Supaya draft baru dari modul Lubrication juga muncul di lonceng
-- notifikasi SPV, sama seperti Checklist PM & Production.
alter table public.notifikasi drop constraint if exists notifikasi_tipe_check;
alter table public.notifikasi
  add constraint notifikasi_tipe_check
  check (tipe in ('laporan', 'pm_checklist', 'production_checklist', 'lubrication_checklist'));

-- ---------- CATATAN ----------
-- Data lama yang sudah pernah disubmit sebelum migrasi ini akan otomatis
-- kebagian review_status = 'draft' (default kolom baru) — jadi akan
-- muncul di tab "Menunggu review" pada halaman Draft dan perlu
-- di-approve/reject manual oleh SPV/superadmin supaya masuk rekap
-- dengan status yang jelas.
