import fs from "fs";
import path from "path";
import ExcelJS from "exceljs";

import dayjsBase from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
dayjsBase.extend(utc); dayjsBase.extend(timezone);
const dayjs = dayjsBase;

const TZ = process.env.TZ || "America/Bogota";

import KizeoVisita from "../models/kizeoVisita.js";

const HEADERS = [
  "Cuenta",
  "Tipo de gestion",
  "Resultado de gestion",
  "Fecha de gestion",
  "Observacion",
  "Fecha de proxima gestion",
  "Proxima gestion",
  "Detalle",
  "Tipo llamada",
  "Duracion llamada",
  "Telefono",
  "Empresa",
];

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); // <- corregido
}

function rangeForDate(yyyy_mm_dd) {
  const base = dayjs.tz(yyyy_mm_dd, TZ);
  if (!base.isValid()) throw new Error("fecha inválida (YYYY-MM-DD)");
  return { start: base.startOf("day").toDate(), end: base.endOf("day").toDate(), base };
}

async function fetchByDate(yyyy_mm_dd) {
  const { start, end } = rangeForDate(yyyy_mm_dd);
  return await KizeoVisita
    .find({ "Fecha de gestion": { $gte: start, $lte: end } })
    .sort({ "Fecha de gestion": 1 })
    .lean();
}

// Fecha en Bogotá para Excel: YYYY/MM/DD HH:MM:SS
const fmtBogotaFechaHora = (d) => {
  if (!d) return "";
  const nd = new Date(d);
  const yyyy = nd.toLocaleString("es-CO", { timeZone: TZ, year: "numeric" });
  const mm = String(nd.toLocaleString("es-CO", { timeZone: TZ, month: "2-digit" }));
  const dd = String(nd.toLocaleString("es-CO", { timeZone: TZ, day: "2-digit" }));
  const hh = String(nd.toLocaleString("es-CO", { timeZone: TZ, hour: "2-digit", hour12: false })).padStart(2, "0");
  const min = String(nd.toLocaleString("es-CO", { timeZone: TZ, minute: "2-digit" })).padStart(2, "0");
  const sec = String(nd.toLocaleString("es-CO", { timeZone: TZ, second: "2-digit" })).padStart(2, "0");
  return `${yyyy}/${mm}/${dd} ${hh}:${min}:${sec}`;
};

// Helper para llenar una hoja (permite forzar duración fija opcionalmente)
function fillWorksheet(ws, rows, { fixedDuration = null } = {}) {
  ws.addRow(HEADERS);

  for (const r of rows) {
    ws.addRow([
      r["Cuenta"] ?? "",
      r["Tipo de gestion"] ?? "",
      r["Resultado de gestion"] ?? "",
      fmtBogotaFechaHora(r["Fecha de gestion"]),
      r["Observacion"] ?? "",
      r["Fecha de proxima gestion"] ?? "",
      r["Proxima gestion"] ?? "",
      r["Detalle"] ?? "",
      r["Tipo llamada"] ?? "",
      fixedDuration ?? (r["Duracion llamada"] ?? ""),
      r["Telefono"] ?? "",
      r["Empresa"] ?? "",
    ]);
  }

  // auto width
  ws.columns.forEach((c) => {
    let w = 12;
    c.eachCell({ includeEmpty: true }, (cell) => {
      const len = String(cell.value ?? "").length + 2;
      if (len > w) w = len;
    });
    c.width = Math.min(w, 50);
  });
}

export async function generarExcelVisitasPorFecha(yyyy_mm_dd) {
  const { base } = rangeForDate(yyyy_mm_dd);
  const rows = await fetchByDate(yyyy_mm_dd);

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Visitas");
  fillWorksheet(ws, rows);

  const outDir = path.join(process.cwd(), "uploads", "reports");
  ensureDir(outDir);
  const file = path.join(outDir, `visitas_${base.format("YYYY-MM-DD")}.xlsx`);
  await wb.xlsx.writeFile(file);
  return file;
}

// NUEVO: genera dos excels (normal + “quasar” con duración fija 00:05:00)
export async function generarExcelsVisitasPorFecha(yyyy_mm_dd) {
  const { base } = rangeForDate(yyyy_mm_dd);
  const rows = await fetchByDate(yyyy_mm_dd);

  const outDir = path.join(process.cwd(), "uploads", "reports");
  ensureDir(outDir);

  // 1) Normal
  const wb1 = new ExcelJS.Workbook();
  fillWorksheet(wb1.addWorksheet("Visitas"), rows);
  const normal = path.join(outDir, `visitas_${base.format("YYYY-MM-DD")}.xlsx`);
  await wb1.xlsx.writeFile(normal);

  // 2) Quasar (Duración fija)
  const wb2 = new ExcelJS.Workbook();
  fillWorksheet(wb2.addWorksheet("Visitas"), rows, { fixedDuration: "00:05:00" });
  const quasar = path.join(outDir, `visitas_${base.format("YYYY-MM-DD")}_subir_quasar.xlsx`);
  await wb2.xlsx.writeFile(quasar);

  return { normal, quasar };
}

export async function generarExcelVisitasAyer() {
  const ayer = dayjs().tz(TZ).subtract(1, "day").format("YYYY-MM-DD");
  return generarExcelVisitasPorFecha(ayer);
}
