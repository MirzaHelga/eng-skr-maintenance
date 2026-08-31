-- ============================================================
-- DELETE POLICY: supaya laporan/checklist lama yang udah approved
-- bisa dibersihkan (dihapus permanen) dari aplikasi.
--
-- Catatan yang sama seperti policy update di add_draft_workflow.sql:
-- app ini masih pakai anon key + password bersama per role, jadi
-- pembatasan "siapa yang boleh hapus" ditegakkan di sisi tampilan
-- (role gate di JS), bukan di RLS.
-- ============================================================

drop policy if exists "laporan deletable by anyone" on public.laporan;
create policy "laporan deletable by anyone" on public.laporan
  for delete using (true);

drop policy if exists "laporan_foto deletable by anyone" on public.laporan_foto;
create policy "laporan_foto deletable by anyone" on public.laporan_foto
  for delete using (true);

drop policy if exists "pm checklist deletable by anyone" on public.pm_checklist_submission;
create policy "pm checklist deletable by anyone" on public.pm_checklist_submission
  for delete using (true);

drop policy if exists "pm_checklist_foto deletable by anyone" on public.pm_checklist_foto;
create policy "pm_checklist_foto deletable by anyone" on public.pm_checklist_foto
  for delete using (true);

drop policy if exists "production checklist deletable by anyone" on public.production_checklist_submission;
create policy "production checklist deletable by anyone" on public.production_checklist_submission
  for delete using (true);

drop policy if exists "production_checklist_foto deletable by anyone" on public.production_checklist_foto;
create policy "production_checklist_foto deletable by anyone" on public.production_checklist_foto
  for delete using (true);
