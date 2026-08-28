import {
  generateExcelVisitsMonth,
  generateExcelVisitsWeek,
  generateExcelVisitsWeekOnlyOutsideMadrid,
  weekRangeForDate
} from "../services/APVisitasReportService.js";
import { graphSendMail } from "../services/graphMailService.js";
import KizeoVisita from "../models/kizeoVisita.js";

import dayjsBase from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
dayjsBase.extend(utc); dayjsBase.extend(timezone);
const dayjs = dayjsBase;
const TZ = process.env.TZ || "America/Bogota";

import { normalizeDate, normalizeDateRange, visitasAPEmailHTML, visitasEmailHTML } from "../utils/mailTemplates.js";
import { isValidDate, isValidMonthYear } from "../utils/date.js";

export async function generarExcelAPVisitasMesController(req, res) {
  try {
    const { month, year } = req.query;
    if (!isValidMonthYear(month, year)) {
      return res.status(400).json({
        ok: false,
        error: "Mes o año inválido.",
      });
    }
    const { file } = await generateExcelVisitsMonth(month, year);
    return res.json({ ok: true, file });
  } catch (e) {
    console.error("generarExcelAPVisitasAyerController:", e);
    return res.status(400).json({ ok: false, error: e.message });
  }
}

export async function generarExcelAPVisitasPorFechaController(req, res) {
  try {
    const { date } = req.query;
    if (!isValidDate(date)) {
      return res.status(400).json({
        ok: false,
        error: "Fecha inválida. Use el formato YYYY-MM-DD",
      });
    }
    const { file } = await generateExcelVisitsWeek(date);
    return res.json({ ok: true, file });
  } catch (e) {
    console.error("generarExcelAPVisitasPorFechaController:", e);
    return res.status(400).json({ ok: false, error: e.message });
  }
}

export async function generarExcelAPVisitasFueraMadridPorFechaController(req, res) {
  try {
    const { date } = req.query;
    if (!isValidDate(date)) {
      return res.status(400).json({
        ok: false,
        error: "Fecha inválida. Use el formato YYYY-MM-DD",
      });
    }
    const { file } = await generateExcelVisitsWeekOnlyOutsideMadrid(date);
    return res.json({ ok: true, file });
  } catch (e) {
    console.error("generarExcelAPVisitasFueraMadridPorFechaController:", e);
    return res.status(400).json({ ok: false, error: e.message });
  }
}

export async function enviarExcelAPVisitasMesController(req, res) {
  try {
    const { month, year } = req.query;
    if (!isValidMonthYear(month, year)) {
      return res.status(400).json({
        ok: false,
        error: "Mes o año inválido.",
      });
    }
    const { file, count: total } = await generateExcelVisitsMonth(month, year);
    const { prettyMonth } = normalizeDate(`${year}-${String(month).padStart(2, '0')}-01`);
    
    const subject = req.body?.subject || `Reporte Visitas Mensual - ${prettyMonth}`;
    const html = visitasAPEmailHTML({
      prettyDate: prettyMonth,
      total,
      footerNote: req.body?.footer,
    });

    const { from, to, cc, bcc, text } = req.body || {};
    await graphSendMail({
      from, to, cc, bcc, subject, html, text,
      filePaths: [file]
    });

    return res.json({ ok: true, file: file, sent: true, total, via: "graph" });
  } catch (e) {
    console.error("enviarExcelAPVisitasAyerController:", e);
    return res.status(400).json({ ok: false, error: e.message });
  }
}

export async function enviarExcelAPVisitasPorFechaController(req, res) {
  try {
    const { date } = req.query;
    if (!isValidDate(date)) {
      return res.status(400).json({
        ok: false,
        error: "Fecha inválida. Use el formato YYYY-MM-DD",
      });
    }
    const { start, end } = weekRangeForDate(date);
    const { file, count: total } = await generateExcelVisitsWeek(date);
    const { pretty } = normalizeDateRange(start, end);
    const subject = req.body?.subject || `Reporte Visitas Pendientes - ${pretty}`;
    const html = visitasEmailHTML({
      prettyDate: pretty,
      total,
      footerNote: req.body?.footer,
    });

    const { from, to, cc, bcc, text } = req.body || {};
    await graphSendMail({
      from, to, cc, bcc, subject, html, text,
      filePaths: [file],
    });

    return res.json({ ok: true, file: file, sent: true, total, via: "graph" });
  } catch (e) {
    console.error("enviarExcelAPVisitasPorFechaController:", e);
    return res.status(400).json({ ok: false, error: e.message });
  }
}

export async function enviarExcelAPVisitasFueraMadridPorFechaController(req, res) {
  try {
    const { date } = req.query;
    if (!isValidDate(date)) {
      return res.status(400).json({
        ok: false,
        error: "Fecha inválida. Use el formato YYYY-MM-DD",
      });
    }
    const { start, end } = weekRangeForDate(date);
    const { file, count: total } = await generateExcelVisitsWeekOnlyOutsideMadrid(date);
    const { pretty } = normalizeDateRange(start, end);
    const subject = req.body?.subject || `Reporte Visitas Pendientes Fuera de Madrid - ${pretty}`;
    const html = visitasEmailHTML({
      prettyDate: pretty,
      total,
      footerNote: req.body?.footer,
    });

    const { from, to, cc, bcc, text } = req.body || {};
    await graphSendMail({
      from, to, cc, bcc, subject, html, text,
      filePaths: [file],
    });

    return res.json({ ok: true, file: file, sent: true, total, via: "graph" });
  } catch (e) {
    console.error("enviarExcelAPVisitasFueraMadridPorFechaController:", e);
    return res.status(400).json({ ok: false, error: e.message });
  }
}
