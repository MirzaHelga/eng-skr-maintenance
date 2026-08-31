// ============================================================
// DATA CHECKLIST LUBRICATION (per line)
// ------------------------------------------------------------
// Sumber: file Excel/CSV "Fox's Lubrication" per line produksi
// (Line 1-4), diolah jadi data statis — pola sama seperti
// js/checklist-data.js & js/production-data.js.
//
// Beda dengan Checklist PM/Production: di sini TIDAK ada pemilihan
// equipment/periode di awal — 1 line = 1 checklist berisi semua titik
// lubrikasi line itu (tiap titik sudah punya frekuensi & info sendiri
// dari data sumbernya). Alur juga TANPA draft/approval — operator isi
// lalu langsung tersimpan (lihat js/lubrication-checklist.js).
//
// CARA NAMBAH/UBAH DATA:
// Tinggal edit array LUBRICATION_ITEMS[<key>] di bawah, format persis
// sama seperti yang sudah ada. Field per titik:
//   no          - nomor urut (string; bisa "10a" untuk sub-titik tanpa
//                 nomor sendiri di data sumber)
//   titik       - nama titik/komponen yang dilumasi
//   lubricant   - jenis pelumas (Type Lubricant)
//   frekuensi   - frekuensi pelumasan (Frequency)
//   statusMesin - "Stop" atau "Running" (kondisi mesin saat dilumasi)
//   metode      - metode aplikasi (Method)
//   estimasiQty - estimasi jumlah pemakaian (Estimate Quantity)
//   critical    - true kalau ditandai "CRITICAL POINT" di data sumber
// ============================================================

export const LUBRICATION_LINES = [
  {
    key: "1",
    label: "Line 1",
    desc: "Titik lubrikasi mesin & equipment di Line 1.",
  },
  {
    key: "2",
    label: "Line 2",
    desc: "Titik lubrikasi mesin & equipment di Line 2.",
  },
  {
    key: "3",
    label: "Line 3",
    desc: "Titik lubrikasi mesin & equipment di Line 3.",
  },
  {
    key: "4",
    label: "Line 4",
    desc: "Titik lubrikasi mesin & equipment di Line 4.",
  },
];

export const LUBRICATION_ITEMS = {
  "1": [
      { no: "1", titik: "Gearbox Agitator Coolmix", lubricant: "CASSIDA FLUIDE GL 220", frekuensi: "Annualy", statusMesin: "Stop", metode: "Manual Filling Sesuai dengan Level oli", estimasiQty: "", critical: false },
      { no: "2", titik: "Gearbox motor phe", lubricant: "OMALA 220", frekuensi: "Annualy", statusMesin: "Stop", metode: "Manual Filling Sesuai dengan Level oli", estimasiQty: "", critical: false },
      { no: "3", titik: "Gearbox PHE pump Fristam", lubricant: "CASSIDA FLUIDE GL 220", frekuensi: "Annualy", statusMesin: "Stop", metode: "Manual Filling Sesuai dengan Level oli", estimasiQty: "", critical: false },
      { no: "4", titik: "Bearing Fristam Pump", lubricant: "CASSIDA HTS 2", frekuensi: "6 Moth", statusMesin: "Stop", metode: "Hand gun 2 stroke", estimasiQty: "", critical: false },
      { no: "5", titik: "Gearbox Feed Pump Cooker", lubricant: "OMALA 220", frekuensi: "6 Month", statusMesin: "Stop", metode: "Manual Filling Sesuai dengan Level oli", estimasiQty: "", critical: false },
      { no: "6", titik: "Top Cooker Rotor", lubricant: "CASSIDA HTS 2", frekuensi: "Shiftly", statusMesin: "Running", metode: "Hand gun 2 stroke", estimasiQty: "", critical: true },
      { no: "7", titik: "Bottom Cooker", lubricant: "CASSIDA HTS 2", frekuensi: "Shiftly", statusMesin: "Running", metode: "Hand gun 2 stroke", estimasiQty: "", critical: true },
      { no: "8", titik: "Gearbox Discharge Pump Fristam", lubricant: "OMALA 220", frekuensi: "6 Month", statusMesin: "Stop", metode: "Manual Filling Sesuai dengan Level oli", estimasiQty: "", critical: false },
      { no: "9", titik: "Gearbox Discharge Pump Fristam", lubricant: "CASSIDA HTS 2", frekuensi: "6 Month", statusMesin: "Stop", metode: "Hand gun .... stroke", estimasiQty: "", critical: false },
      { no: "10", titik: "(nama titik tidak tercantum di data sumber)", lubricant: "CASSIDA HTS 2", frekuensi: "1 Bulan", statusMesin: "Running", metode: "", estimasiQty: "", critical: false },
      { no: "11", titik: "Gearbox Dosing Pump/MPL Pump", lubricant: "CASSIDA FLUIDE GL 220", frekuensi: "Annualy", statusMesin: "Stop", metode: "Manual Filling Sesuai dengan Level oli", estimasiQty: "", critical: false },
      { no: "12", titik: "Main Gearbox", lubricant: "RORED HD A90", frekuensi: "Annualy", statusMesin: "Stop", metode: "Manual Filling Sesuai dengan Level oli", estimasiQty: "", critical: false },
      { no: "13", titik: "Chaindrive unit", lubricant: "TURALIK 48", frekuensi: "6 Month", statusMesin: "Stop", metode: "Manual Brush", estimasiQty: "", critical: false },
      { no: "14", titik: "Block Bearing", lubricant: "SHELL GADUS", frekuensi: "3 Month", statusMesin: "Stop", metode: "Hand gun 2 stroke", estimasiQty: "", critical: false },
      { no: "15", titik: "Mould Chain", lubricant: "CRC PENETRATING OIL", frekuensi: "6 Month", statusMesin: "Stop", metode: "Spray sampai melapisi permukaan rantai", estimasiQty: "", critical: false },
      { no: "16", titik: "Gearbox motor drive tunnel Conveyor", lubricant: "OMALA 220", frekuensi: "Annualy", statusMesin: "Stop", metode: "Manual Filling Sesuai dengan Level oli", estimasiQty: "", critical: false },
      { no: "17", titik: "Chaindrive Tunnel Conveyor", lubricant: "DARINA R2", frekuensi: "6 month", statusMesin: "Stop", metode: "Manual Brush", estimasiQty: "", critical: false },
      { no: "18", titik: "Gearbox motor drive transfer conveyor metal detector", lubricant: "OMALA 220", frekuensi: "Annualy", statusMesin: "Stop", metode: "Manual Filling Sesuai dengan Level oli", estimasiQty: "", critical: false },
      { no: "19", titik: "Chain Drive metal detector Conveyor", lubricant: "DARINA R2", frekuensi: "6 Month", statusMesin: "Stop", metode: "Manual Brush", estimasiQty: "", critical: false },
      { no: "20", titik: "Gearbox Agitator Liquid Rework", lubricant: "CASSIDA FLUIDE GL 220", frekuensi: "Annualy", statusMesin: "Stop", metode: "Manual Filling Sesuai dengan Level oli", estimasiQty: "", critical: false },
  ],
  "2": [
      { no: "1", titik: "Gearbox Agitator Coolmix", lubricant: "FMO 350", frekuensi: "Annualy", statusMesin: "Stop", metode: "Manual Filling Sesuai dengan Level oli", estimasiQty: "", critical: false },
      { no: "2", titik: "Gearbox Variator PHE pump Motovario", lubricant: "OMALA 220", frekuensi: "Annualy", statusMesin: "Stop", metode: "Manual Filling Sesuai dengan Level oli", estimasiQty: "", critical: false },
      { no: "3", titik: "Gearbox PHE Fristam", lubricant: "FMO 350", frekuensi: "6 Month", statusMesin: "Stop", metode: "Manual Filling Sesuai dengan Level oli", estimasiQty: "", critical: false },
      { no: "4", titik: "Bearing Fristam Pump", lubricant: "CASSIDA HTS 2", frekuensi: "3 Month", statusMesin: "Stop", metode: "Hand gun 2 stroke", estimasiQty: "", critical: false },
      { no: "5", titik: "Gearbox Feed Pump Cooker", lubricant: "OMALA 220", frekuensi: "6 Month", statusMesin: "Stop", metode: "Manual Filling Sesuai dengan Level oli", estimasiQty: "", critical: false },
      { no: "6", titik: "Top Cooker Rotor", lubricant: "CASSIDA HTS 2", frekuensi: "Shiftly", statusMesin: "Running", metode: "Hand gun 2 stroke", estimasiQty: "", critical: true },
      { no: "7", titik: "Bottom Cooker", lubricant: "CASSIDA HTS 2", frekuensi: "Shiftly", statusMesin: "Running", metode: "Hand gun 2 stroke", estimasiQty: "", critical: true },
      { no: "8", titik: "Gearbox Discharge Pump Fristam", lubricant: "OMALA 220", frekuensi: "3 Month", statusMesin: "Stop", metode: "Manual Filling Sesuai dengan Level oli", estimasiQty: "", critical: false },
      { no: "9", titik: "Gearbox Discharge Pump Fristam", lubricant: "CASSIDA HTS 2", frekuensi: "3 Month", statusMesin: "Stop", metode: "Manual Filling Sesuai dengan Level oli", estimasiQty: "", critical: false },
      { no: "10", titik: "Gearbox Dosing Pump/MPL Pump", lubricant: "OMALA 220", frekuensi: "Annualy", statusMesin: "Stop", metode: "Manual Filling Sesuai dengan Level oli", estimasiQty: "", critical: false },
      { no: "11", titik: "Main Gearbox", lubricant: "OMALA 220", frekuensi: "Annualy", statusMesin: "Stop", metode: "Manual Filling Sesuai dengan Level oli", estimasiQty: "", critical: false },
      { no: "12", titik: "Chaindrive unit", lubricant: "TURALIK 48", frekuensi: "6 Month", statusMesin: "Stop", metode: "Manual Brush", estimasiQty: "", critical: false },
      { no: "13", titik: "Block Bearing", lubricant: "SHEEL GADUS", frekuensi: "3 Month", statusMesin: "Stop", metode: "Hand gun 2 stroke", estimasiQty: "", critical: false },
      { no: "14", titik: "Mould Chain", lubricant: "CRC Penetrating Oil", frekuensi: "3 Month", statusMesin: "Stop", metode: "Spray sampai melapisi permukaan rantai", estimasiQty: "", critical: false },
      { no: "15", titik: "Air Regulator", lubricant: "TURALIK 48", frekuensi: "Annualy", statusMesin: "Stop", metode: "Manual Filling Sesuai dengan Level oli", estimasiQty: "", critical: false },
      { no: "16", titik: "Gearbox motor drive tunnel Conveyor", lubricant: "OMALA 220", frekuensi: "Annualy", statusMesin: "Stop", metode: "Manual Filling Sesuai dengan Level oli", estimasiQty: "", critical: false },
      { no: "17", titik: "Chaindrive Tunnel Conveyor", lubricant: "TURALIK 48", frekuensi: "6 month", statusMesin: "Stop", metode: "Manual Brush", estimasiQty: "", critical: false },
      { no: "18", titik: "Gearbox motor drive transfer conveyor metal detector", lubricant: "OMALA 220", frekuensi: "Annualy", statusMesin: "Stop", metode: "Manual Filling Sesuai dengan Level oli", estimasiQty: "", critical: false },
      { no: "19", titik: "Chain Drive metal detector Conveyor", lubricant: "TURALIK 48", frekuensi: "6 Month", statusMesin: "Stop", metode: "Manual Brush", estimasiQty: "", critical: false },
      { no: "20", titik: "Gearbox Agitator Liquid Rework", lubricant: "FMO350", frekuensi: "Annualy", statusMesin: "Stop", metode: "Manual Filling Sesuai dengan Level oli", estimasiQty: "", critical: false },
  ],
  "3": [
      { no: "1", titik: "Gearbox Agitator Coolmix", lubricant: "FMO 350", frekuensi: "Annualy", statusMesin: "Stop", metode: "Manual Filling Sesuai dengan Level oli", estimasiQty: "", critical: false },
      { no: "2", titik: "Gearbox Variator PHE pump Motovario", lubricant: "OMALA 220", frekuensi: "Annualy", statusMesin: "Stop", metode: "Manual Filling Sesuai dengan Level oli", estimasiQty: "", critical: false },
      { no: "3", titik: "Gearbox PHE Fristam", lubricant: "", frekuensi: "6 Month", statusMesin: "Stop", metode: "Manual Filling Sesuai dengan Level oli", estimasiQty: "", critical: false },
      { no: "4", titik: "Bearing Fristam Pump", lubricant: "CASSIDA HTS 2", frekuensi: "3 Month", statusMesin: "Stop", metode: "Hand gun 2 stroke", estimasiQty: "", critical: false },
      { no: "5", titik: "Gearbox Feed Pump Cooker", lubricant: "OMALA 220", frekuensi: "6 Month", statusMesin: "Stop", metode: "Manual Filling Sesuai dengan Level oli", estimasiQty: "", critical: false },
      { no: "6", titik: "Top Cooker Rotor", lubricant: "CASSIDA HTS 2", frekuensi: "Shiftly", statusMesin: "Running", metode: "Hand gun 2 stroke", estimasiQty: "", critical: true },
      { no: "7", titik: "Bottom Cooker", lubricant: "CASSIDA HTS 2", frekuensi: "Shiftly", statusMesin: "Running", metode: "Hand gun 2 stroke", estimasiQty: "", critical: true },
      { no: "8", titik: "Gearbox Discharge Pump Fristam", lubricant: "", frekuensi: "3 Month", statusMesin: "Stop", metode: "Manual Filling Sesuai dengan Level oli", estimasiQty: "", critical: false },
      { no: "9", titik: "Gearbox Discharge Pump Fristam", lubricant: "CASSIDA FLUIDE GL 220", frekuensi: "3 Month", statusMesin: "Stop", metode: "Manual Filling Sesuai dengan Level oli", estimasiQty: "", critical: false },
      { no: "10", titik: "Gearbox Motor Incorporator Pump", lubricant: "FMO 350", frekuensi: "Annualy", statusMesin: "Stop", metode: "Manual Filling Sesuai dengan Level oli", estimasiQty: "", critical: false },
      { no: "11", titik: "Gearbox Dosing Pump/MPL Pump", lubricant: "CASSIDA FLUIDE GL 220", frekuensi: "Annualy", statusMesin: "Stop", metode: "Manual Filling Sesuai dengan Level oli", estimasiQty: "", critical: false },
      { no: "12", titik: "Main Gearbox", lubricant: "RORED HD A90", frekuensi: "Annualy", statusMesin: "Stop", metode: "Manual Filling Sesuai dengan Level oli", estimasiQty: "", critical: false },
      { no: "13", titik: "Chaindrive unit", lubricant: "TURALIK 48", frekuensi: "6 Month", statusMesin: "Stop", metode: "Manual Brush", estimasiQty: "", critical: false },
      { no: "14", titik: "Block Bearing", lubricant: "SHELL GADUS", frekuensi: "3 Month", statusMesin: "Stop", metode: "Hand gun 2 stroke", estimasiQty: "", critical: false },
      { no: "15", titik: "Mould Chain", lubricant: "CRC Penetrating Oil", frekuensi: "3 Month", statusMesin: "Stop", metode: "Spray sampai melapisi permukaan rantai", estimasiQty: "", critical: false },
      { no: "16", titik: "Air Regulator", lubricant: "TURALIK 48", frekuensi: "Annualy", statusMesin: "Stop", metode: "Manual Filling Sesuai dengan Level oli", estimasiQty: "", critical: false },
      { no: "17", titik: "Gearbox motor drive tunnel Conveyor", lubricant: "OMALA 220", frekuensi: "Annualy", statusMesin: "Stop", metode: "Manual Filling Sesuai dengan Level oli", estimasiQty: "", critical: false },
      { no: "18", titik: "Chaindrive Tunnel Conveyor", lubricant: "", frekuensi: "6 month", statusMesin: "Stop", metode: "Manual Brush", estimasiQty: "", critical: false },
      { no: "19", titik: "Gearbox motor drive transfer conveyor metal detector", lubricant: "OMALA 220", frekuensi: "Annualy", statusMesin: "Stop", metode: "Manual Filling Sesuai dengan Level oli", estimasiQty: "", critical: false },
      { no: "20", titik: "Chain Drive metal detector Conveyor", lubricant: "", frekuensi: "6 month", statusMesin: "Stop", metode: "Manual Brush", estimasiQty: "", critical: false },
      { no: "21", titik: "Gearbox Agitator Liquid Rework", lubricant: "FMO 350", frekuensi: "Annualy", statusMesin: "Stop", metode: "Manual Filling Sesuai dengan Level oli", estimasiQty: "", critical: false },
  ],
  "4": [
      { no: "1", titik: "Gearbox agitator autofeed", lubricant: "FMO350", frekuensi: "Annualy", statusMesin: "Stop", metode: "Manual Filling Sesuai dengan Level oli", estimasiQty: "", critical: false },
      { no: "2", titik: "Gearbox Agitator Coolmix", lubricant: "FMO350", frekuensi: "Annualy", statusMesin: "Stop", metode: "Manual Filling Sesuai dengan Level oli", estimasiQty: "", critical: false },
      { no: "3", titik: "Gearbox PHE Pump", lubricant: "OMALA 220", frekuensi: "Annualy", statusMesin: "Stop", metode: "Manual Filling Sesuai dengan Level oli", estimasiQty: "0.55 Liter", critical: false },
      { no: "3a", titik: "PHE Pump", lubricant: "CASSIDA FLUIDE GL 220", frekuensi: "Annualy", statusMesin: "", metode: "", estimasiQty: "", critical: false },
      { no: "4", titik: "Gearbox Dosing Pump for Spring Tea Varriant", lubricant: "FMO350", frekuensi: "Annualy", statusMesin: "Stop", metode: "Manual Filling Sesuai dengan Level oli", estimasiQty: "0.75 Liter", critical: false },
      { no: "5", titik: "Gearbox Feed Pump Cooker", lubricant: "OMALA 220", frekuensi: "Annualy", statusMesin: "Stop", metode: "Manual Filling Sesuai dengan Level oli", estimasiQty: "0.2 Liter", critical: false },
      { no: "5a", titik: "Flash Vasell Pump", lubricant: "FMO350", frekuensi: "Annualy", statusMesin: "", metode: "", estimasiQty: "", critical: false },
      { no: "6", titik: "Gearbox Motor drive Discharge Pump 1", lubricant: "OMALA 220", frekuensi: "Annualy", statusMesin: "Stop", metode: "Manual Filling Sesuai dengan Level oli", estimasiQty: "1,5 Liter", critical: false },
      { no: "7", titik: "Gland Packing Bushing Discharge Pump 1", lubricant: "Glycerin", frekuensi: "Shiftly", statusMesin: "Running", metode: "", estimasiQty: "", critical: false },
      { no: "8", titik: "Gearbox Motor drive Discharge Pump 2", lubricant: "OMALA 220", frekuensi: "Annualy", statusMesin: "Stop", metode: "Manual Filling Sesuai dengan Level oli", estimasiQty: "1,5 Liter", critical: false },
      { no: "9", titik: "Gland Packing Bushing Discharge Pump 1", lubricant: "Glycerin", frekuensi: "Shiftly", statusMesin: "Running", metode: "", estimasiQty: "", critical: false },
      { no: "10", titik: "Top Cooker Rotor", lubricant: "CASIDA HTS2", frekuensi: "Shiftly", statusMesin: "Running", metode: "Hand gun stroke", estimasiQty: "2 Stroke", critical: true },
      { no: "11", titik: "Bottom Cooker", lubricant: "CASIDA HTS2", frekuensi: "Shiftly", statusMesin: "Running", metode: "Hand gun stroke", estimasiQty: "2 Stroke", critical: true },
      { no: "12", titik: "Gearbox Incorporator 1", lubricant: "FMO350", frekuensi: "Annualy", statusMesin: "Stop", metode: "Manual Filling Sesuai dengan Level oli", estimasiQty: "review", critical: false },
      { no: "13", titik: "Gearbox Incorporator 2", lubricant: "FMO350", frekuensi: "Annualy", statusMesin: "Stop", metode: "Manual Filling Sesuai dengan Level oli", estimasiQty: "", critical: false },
      { no: "14", titik: "Gearbox Dosing Pump 1 for Flavor Color", lubricant: "CASSIDA FLUIDE GL 220", frekuensi: "Annualy", statusMesin: "Stop", metode: "Manual Filling Sesuai dengan Level oli", estimasiQty: "0,75 Liter", critical: false },
      { no: "15", titik: "Gearbox Dosing Pump 1 for Acid", lubricant: "CASSIDA FLUIDE GL 220", frekuensi: "Annualy", statusMesin: "Stop", metode: "Manual Filling Sesuai dengan Level oli", estimasiQty: "0,45 Liter", critical: false },
      { no: "16", titik: "Gear Box Dosing Pump 2 for Flavor Color", lubricant: "CASSIDA FLUIDE GL 220", frekuensi: "Annualy", statusMesin: "Stop", metode: "Manual Filling Sesuai dengan Level oli", estimasiQty: "0,75 Liter", critical: false },
      { no: "17", titik: "Gear Box Dosing Pump 2 for Acid", lubricant: "CASSIDA FLUIDE GL 220", frekuensi: "Annualy", statusMesin: "Stop", metode: "Manual Filling Sesuai dengan Level oli", estimasiQty: "0,45 Liter", critical: false },
      { no: "18", titik: "Main Gearbox Hopper Lifter", lubricant: "MOBILITH SCH 220", frekuensi: "", statusMesin: "", metode: "", estimasiQty: "", critical: false },
      { no: "19", titik: "Bearing Follower", lubricant: "MOBILITH SCH 220", frekuensi: "", statusMesin: "", metode: "", estimasiQty: "", critical: false },
      { no: "20", titik: "Block Bearing Bushing", lubricant: "", frekuensi: "", statusMesin: "", metode: "", estimasiQty: "", critical: false },
      { no: "21", titik: "Servomotor Hopper Drive", lubricant: "MOBILITH SCH 220", frekuensi: "Weekly", statusMesin: "", metode: "GRASE GUN", estimasiQty: "", critical: false },
      { no: "22", titik: "Servomotor Sylinder Piston", lubricant: "MOBILITH SCH 220", frekuensi: "Weekly", statusMesin: "", metode: "GREASE GUN", estimasiQty: "", critical: false },
      { no: "23", titik: "Mould Chain", lubricant: "CRC Penetrating Oil", frekuensi: "Weekly", statusMesin: "Running", metode: "", estimasiQty: "", critical: false },
      { no: "24", titik: "Gearbox motor drive Cooling Tunnel Conveyor", lubricant: "OMALA 220", frekuensi: "Annualy", statusMesin: "Stop", metode: "Manual Filling Sesuai dengan Level oli", estimasiQty: "", critical: false },
      { no: "25", titik: "Gearbox Maindrive mould", lubricant: "OMALA 220", frekuensi: "Annualy", statusMesin: "Stop", metode: "Manual Filling Sesuai dengan Level oli", estimasiQty: "", critical: false },
      { no: "26", titik: "Gearbox motor drive transfer conveyor Metal Detector", lubricant: "OMALA 220", frekuensi: "Annualy", statusMesin: "Stop", metode: "Manual Filling Sesuai dengan Level oli", estimasiQty: "", critical: false },
      { no: "27", titik: "Gearbox motor drive Automatic Weigher and Transfer 1", lubricant: "OMALA 220", frekuensi: "Annualy", statusMesin: "Stop", metode: "Manual Filling Sesuai dengan Level oli", estimasiQty: "", critical: false },
      { no: "28", titik: "Gearbox motor drive Automatic Weigher and Transfer 2", lubricant: "OMALA 220", frekuensi: "Annualy", statusMesin: "Stop", metode: "Manual Filling Sesuai dengan Level oli", estimasiQty: "", critical: false },
      { no: "29", titik: "Gearbox Liquid Rework", lubricant: "FMO350", frekuensi: "Annualy", statusMesin: "Stop", metode: "Manual Filling Sesuai dengan Level oli", estimasiQty: "", critical: false },
      { no: "30", titik: "Oil Heater Hopper Jacket", lubricant: "PURITY FG HEATER", frekuensi: "", statusMesin: "Stop", metode: "Manual Filling Sesuai dengan Level oli", estimasiQty: "", critical: false },
  ],
};

export function findLubricationLine(key) {
  return LUBRICATION_LINES.find((l) => l.key === key) || null;
}

export function lubricationItemsFor(key) {
  return LUBRICATION_ITEMS[key] || [];
}

// ============================================================
// PENGELOMPOKAN PER FREKUENSI
// ------------------------------------------------------------
// Line 1-4 masing-masing punya 20-30 titik lubrikasi dengan frekuensi
// beda-beda (Shiftly, Weekly, 3 Month, 6 Month, Annualy, dst). Daripada
// 1 line = 1 form isian raksasa, checklist dipecah per kategori
// frekuensi: 1 line + 1 kategori = 1 form/submission sendiri. Operator
// jadi bisa isi "Shiftly" tiap shift tanpa harus scroll lewatin titik
// yang frekuensinya tahunan, dan sebaliknya.
// ============================================================

export const FREKUENSI_GROUPS = [
  { key: "shiftly", label: "Shiftly", test: (f) => /shift/i.test(f) },
  { key: "weekly", label: "Mingguan", test: (f) => /week|minggu/i.test(f) },
  { key: "monthly", label: "Bulanan", test: (f) => /^1\s*bulan$|monthly|bulanan/i.test(f) },
  { key: "3month", label: "3 Bulan", test: (f) => /3\s*(month|bulan)/i.test(f) },
  { key: "6month", label: "6 Bulan", test: (f) => /6\s*(month|moth|bulan)/i.test(f) },
  { key: "annual", label: "Tahunan", test: (f) => /annual|year|tahun/i.test(f) },
];

export const FREKUENSI_GROUP_ORDER = ["shiftly", "weekly", "monthly", "3month", "6month", "annual", "other"];

export function classifyFrekuensi(freq) {
  const f = (freq || "").trim();
  if (!f) return "other";
  const found = FREKUENSI_GROUPS.find((g) => g.test(f));
  return found ? found.key : "other";
}

export function frekuensiGroupLabel(key) {
  const found = FREKUENSI_GROUPS.find((g) => g.key === key);
  return found ? found.label : "Lainnya";
}

// Daftar kategori frekuensi yang benar-benar ada di suatu line, urut
// sesuai FREKUENSI_GROUP_ORDER, lengkap dengan jumlah titiknya.
export function frekuensiGroupsForLine(lineKey) {
  const items = lubricationItemsFor(lineKey);
  return FREKUENSI_GROUP_ORDER
    .map((groupKey) => ({
      key: groupKey,
      label: frekuensiGroupLabel(groupKey),
      count: items.filter((item) => classifyFrekuensi(item.frekuensi) === groupKey).length,
    }))
    .filter((g) => g.count > 0);
}

// Titik lubrikasi 1 line, difilter ke 1 kategori frekuensi saja —
// inilah yang dipakai buat isi form per kategori.
export function lubricationItemsForGroup(lineKey, groupKey) {
  return lubricationItemsFor(lineKey).filter((item) => classifyFrekuensi(item.frekuensi) === groupKey);
}
