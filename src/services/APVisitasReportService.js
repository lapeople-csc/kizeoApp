import fs from "fs";
import path from "path";
import ExcelJS from "exceljs";

import dayjsBase from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
dayjsBase.extend(utc); dayjsBase.extend(timezone);
const dayjs = dayjsBase;

const KIZEO_DATETIME_FORMAT = "YYYY-MM-DD HH:mm";
const TZ = process.env.TZ || "America/Bogota";

import { kizeoGetDataService, getListByIdServices } from "./kizeoGetDataService.js";

const FORMID = '1184787';
const ADVISERLISTID = '498419';
const LEADERLISTID = '498430';
const FIELDREPRESENTATIVELISTID = '498429';
const HEADERS = [
  "Fecha y hora de la solicitud",
  "Nombre de quien solicita la visita",
  "Tipo de diligencia",
  "Zona",
  "Lider",
  "Activo",
  "Contrato No.",
  "Nombre y Apellido - Inquilino1",
  "Dirección del inmueble arrendado",
  "Ciudad del inmueble arrendado",
  "Valor Renta",
  "Base de cobro",
  "Etapa de cobro",
  "Mes Reporte",
  "Tipo de solicitud de la visita",
  "Calidad de la persona a visitar",
  "Lugar de la visita",
  "Dirección Lugar de la diligencia",
  "Ciudad Lugar de la diligencia",
  "Objetivo de la solicitud",
  "Gestor de campo - Madrid",
  "Fecha y hora de la diligencia",
  "Geolocalizacion",
  "Foto Lugar de la diligencia",
  "Resultado Visita (Observación)",
  "Persona que recibe la  notificación",
  "Nombre",
  "Celular",
  "Vinculo con Inquilino",
  "Estado",
  "Tiempo de Realización / Transcurrido"
];

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); // <- corregido
}

function rangeForDate(yyyy_mm_dd) {
  const base = dayjs.tz(yyyy_mm_dd, TZ);
  if (!base.isValid()) throw new Error("fecha inválida (YYYY-MM-DD)");
  return { start: base.startOf("day").toDate(), end: base.endOf("day").toDate(), base };
}

function rangeForYearAndMonth(month, year) {
  const base = dayjs.tz(`${year}-${month}-01`, TZ); 
  
  if (!base.isValid()) {
    throw new Error("año o mes inválido");
  }
  
  return {
    start: base.startOf("month").toDate(),
    end: base.endOf("month").toDate(),
    base
  };
}

export function weekRangeForDate(date) {
  const base = dayjs.tz(date, TZ);
  
  if (!base.isValid()) {
    throw new Error("fecha inválida");
  }
  
  return {
    start: base.startOf("week").toDate(),
    end: base.endOf("week").toDate(),
    base
  };
}

function formatKizeoDate(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatKizeoDateOnlyDate(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseKizeoDate(value) {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (trimmed.length === 0) return null;

  const parsed = dayjs.tz(trimmed, KIZEO_DATETIME_FORMAT, TZ);

  return parsed.isValid() ? parsed : null;
}

async function fetchByDate(start, end) {
  const filters = (start && end)
  ? [
      {
        type: "AND",
        components: [
          { field: "fecha_y_hora_2aba7625", operator: ">=", type: "simple", val: formatKizeoDate(start) },
          { field: "fecha_y_hora_2aba7625", operator: "<=", type: "simple", val: formatKizeoDate(end) }
        ]
      }
    ]
  : undefined;
  return await kizeoGetDataService(
    FORMID,
    {
      format: "basic",
      ...(filters ? { filters } : {}),
    }
  )
}

function getVisitStatusAndTiming(scheduledDateRaw, completedDateRaw, now, endDateRaw) {
  const scheduledDate = parseKizeoDate(scheduledDateRaw) ?? now;
  const completedDate = parseKizeoDate(completedDateRaw);
  const status = completedDate ? "Realizada" : "Pendiente";

  const endDate = parseKizeoDate(endDateRaw) ?? now;
  const pendingReference = endDate.isAfter(now) ? now : endDate;

  const time = completedDate
    ? calculateTime(scheduledDate, completedDate)
    : calculateTime(scheduledDate, pendingReference);

  return { scheduledDate, completedDate, status, time };
}

function calculateTime(from, to) {
  const ms = Math.max(0, to.diff(from));
  const totalMinutes = Math.round(ms / (1000 * 60));

  const days = Math.floor(totalMinutes / (60 * 24));
  const remainderMinutes = totalMinutes % (60 * 24);
  const hours = Math.floor(remainderMinutes / 60);
  const minutes = remainderMinutes % 60;

  const parts = [];
  if (days > 0) parts.push(`${days} dia${days === 1 ? "" : "s"}`);
  if (hours > 0) parts.push(`${hours} hora${hours === 1 ? "" : "s"}`);
  if (minutes > 0) parts.push(`${minutes} minuto${minutes === 1 ? "" : "s"}`);

  return {
    days,
    hours,
    minutes,
    totalMinutes,
    text: parts.length > 0 ? parts.join(" ") : "menos de 1 minuto",
  };
}

function buildListIndex(list) {
  const index = {};

  for (const item of list.items) {
    const [primeraColumna] = item.split("|");
    const separador = primeraColumna.indexOf(":");

    if (separador === -1) continue;

    const id = primeraColumna.slice(0, separador);
    const nombre = primeraColumna.slice(separador + 1);

    index[id] = nombre;
  }

  return index;
}

function buildImageLink(recordId, img) {
  const image = img.replace(/\.[^/.]+$/, "");

  return `https://forms.kizeo.com/rest_webapp/api/forms/${FORMID}/data/${recordId}/medias/${image}`;
} 

// Helper para llenar una hoja (permite forzar duración fija opcionalmente)
async function fillWorksheet(ws, rows, { fixedDuration = null } = {}, endDateRaw) {
  const adviserList = await getListByIdServices(ADVISERLISTID)
  const advisers = buildListIndex(adviserList.list)
  const leaderList = await getListByIdServices(LEADERLISTID)
  const leaders = buildListIndex(leaderList.list)
  const fieldRepresentativeList = await getListByIdServices(FIELDREPRESENTATIVELISTID)
  const fieldRepresentatives = buildListIndex(fieldRepresentativeList.list)

  ws.addRow(HEADERS);
  const now = dayjs().tz(TZ);

  for (const r of rows) {
    const calculatedInfo = getVisitStatusAndTiming(
      r["fields"]?.["fecha_y_hora_2aba7625"]?.["values"]?.[0]?.["value"] ?? "",
      r["fields"]?.["fecha_y_hora_cfd41552"]?.["values"]?.[0]?.["value"] ?? "",
      now,
      String(endDateRaw)
    )

    ws.addRow([
      r["fields"]?.["fecha_y_hora_2aba7625"]?.["values"]?.[0]?.["value"] ?? "",
      advisers[r["fields"]?.["nombre_de_quien_solicita_la_v"]?.["values"]?.[0]?.["value"]] ?? "",
      r["fields"]?.["tipo_de_diligencia"]?.["values"]?.[0]?.["value"] ?? "",
      r["fields"]?.["zona"]?.["values"]?.[0]?.["value"] ?? "",
      leaders[r["fields"]?.["lider"]?.["values"]?.[0]?.["value"]] ?? "",
      r["fields"]?.["activo_36afc6a3"]?.["values"]?.[0]?.["value"] ?? "",
      r["fields"]?.["contrato_no_625f0a95"]?.["values"]?.[0]?.["value"] ?? "",
      r["fields"]?.["inquilinos_27c5fc29"]?.["values"]?.[0]?.["nombre_y_apellidos_del_inquil"]?.["values"]?.[0]?.["value"] ?? "",
      r["fields"]?.["direccion_de_3fa95152_address"]?.["values"]?.[0]?.["value"] ?? "",
      r["fields"]?.["ciudad_del_i_00482a59"]?.["values"]?.[0]?.["value"] ?? "",
      r["fields"]?.["valor_renta_22cfc9fc"]?.["values"]?.[0]?.["value"] ?? "",
      r["fields"]?.["base_de_cobro"]?.["values"]?.[0]?.["value"] ?? "",
      r["fields"]?.["etapa_de_cobro"]?.["values"]?.[0]?.["value"] ?? "",
      r["fields"]?.["mes_reporte"]?.["values"]?.[0]?.["value"] ?? "",
      r["fields"]?.["tipo_de_solicitud_de_la_visit1"]?.["values"]?.[0]?.["value"] ?? "",
      r["fields"]?.["calidad_de_la_persona_a_visit"]?.["values"]?.[0]?.["value"] ?? "",
      r["fields"]?.["lugar_de_la_visita"]?.["values"]?.[0]?.["value"] ?? "",
      r["fields"]?.["direccion_lu_e16bfaed_address"]?.["values"]?.[0]?.["value"] ?? "",
      r["fields"]?.["ciudad_lugar_e423a897"]?.["values"]?.[0]?.["value"] ?? "",
      r["fields"]?.["objetivo_de__47ddfac9"]?.["values"]?.[0]?.["value"] ?? "",
      fieldRepresentatives[r["fields"]?.["gestor_de_campo"]?.["values"]?.[0]?.["value"]] ?? "",
      r["fields"]?.["fecha_y_hora_cfd41552"]?.["values"]?.[0]?.["value"] ?? "",
      `Latitud: ${r["fields"]?.["geolocalizac_43b4df5e_latitude"]?.["values"]?.[0]?.["value"] ?? ""} Longitud: ${r["fields"]?.["geolocalizac_43b4df5e_longitude"]?.["values"]?.[0]?.["value"] ?? ""} Altitud: ${r["fields"]?.["geolocalizac_43b4df5e_altitude"]?.["values"]?.[0]?.["value"] ?? ""}`,
      // r["fields"]?.["foto_lugar_d_13b510c2"]?.["values"]?.[0]?.["value"] ?? "", //validar
      buildImageLink(r["id"], r["fields"]?.["foto_lugar_d_13b510c2"]?.["values"]?.[0]?.["value"] ?? "") ?? "",
      r["fields"]?.["resultado_vi_de5c3922"]?.["values"]?.[0]?.["value"] ?? "",
      r["fields"]?.["recibe_la_notificacion"]?.["values"]?.[0]?.["value"] ?? "",
      r["fields"]?.["nombre_93dccfb7"]?.["values"]?.[0]?.["value"] ?? "",
      r["fields"]?.["celular_f07e2872"]?.["values"]?.[0]?.["value"] ?? "",
      r["fields"]?.["vinculo_con__1c32383f"]?.["values"]?.[0]?.["value"] ?? "",
      calculatedInfo.status,
      calculatedInfo.time.text
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

export async function generateExcelVisitsMonth(month, year) {
  const { start, end } = rangeForYearAndMonth(month, year);
  const rows = await fetchByDate(start, end);
  
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Visitas");
  await fillWorksheet(ws, rows, {}, formatKizeoDate(end));

  const outDir = path.join(process.cwd(), "uploads", "reports");
  ensureDir(outDir);
  const file = path.join(outDir, `visitas_${year}-${month}.xlsx`);
  await wb.xlsx.writeFile(file);
  return { file, count: rows.length };
}

export async function generateExcelVisitsWeek(date) {
  const { start, end } = weekRangeForDate(date);
  const data = await fetchByDate(start, end);
  const rows = data.filter((r) => r["fields"]?.["fecha_y_hora_cfd41552"]?.["values"]?.[0]?.["value"] == '');

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Visitas");
  await fillWorksheet(ws, rows, {}, formatKizeoDate(end));

  const outDir = path.join(process.cwd(), "uploads", "reports");
  ensureDir(outDir);
  const file = path.join(outDir, `visitas_pendientes_${formatKizeoDateOnlyDate(start)}_${formatKizeoDateOnlyDate(end)}.xlsx`);
  await wb.xlsx.writeFile(file);
  return { file, count: rows.length };
}

export async function generateExcelVisitsWeekOnlyOutsideMadrid(date) {
  const { start, end } = weekRangeForDate(date);
  const data = await fetchByDate(start, end);
  const dataOnlyPending = data.filter((r) => r["fields"]?.["fecha_y_hora_cfd41552"]?.["values"]?.[0]?.["value"] == '');
  const rows = dataOnlyPending.filter((r) => r["fields"]?.["zona"]?.["values"]?.[0]?.["value"] !== 'Madrid');

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Visitas");
  await fillWorksheet(ws, rows, {}, formatKizeoDate(end));

  const outDir = path.join(process.cwd(), "uploads", "reports");
  ensureDir(outDir);
  const file = path.join(outDir, `visitas_pendientes_fuera_madrid_${formatKizeoDateOnlyDate(start)}_${formatKizeoDateOnlyDate(end)}.xlsx`);
  await wb.xlsx.writeFile(file);
  return { file, count: rows.length };
}
