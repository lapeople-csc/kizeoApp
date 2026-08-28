// src/utils/mailTemplates.js
import dayjs from "dayjs";
import "dayjs/locale/es.js";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
dayjs.extend(utc); dayjs.extend(timezone);

const TZ = process.env.TZ || "America/Bogota";
dayjs.locale("es");

// "2025-09-03" -> { slug: "2025-09-03", pretty: "jueves, 3 de septiembre de 2025", prettyMonth: "septiembre de 2025" }
export function normalizeDate(dateStr) {
  const d = dayjs.tz(dateStr, TZ);
  return {
    slug: d.format("YYYY-MM-DD"),
    pretty: d.format("dddd, D [de] MMMM [de] YYYY"),
    prettyMonth: d.format("MMMM [de] YYYY")
  };
}

export function normalizeDateRange(startDate, endDate) {
  const start = dayjs.tz(startDate, TZ);
  const end = dayjs.tz(endDate, TZ);

  return {
    start: start.format("YYYY-MM-DD"),
    end: end.format("YYYY-MM-DD"),
    pretty: `${start.format("D [de] MMMM")} al ${end.format("D [de] MMMM [de] YYYY")}`,
  };
}

export function visitasEmailHTML({ prettyDate, total, footerNote }) {
  return `
  <div style="background:#f6f8fb;padding:24px;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#222;">
    <div style="max-width:620px;margin:auto;background:#ffffff;border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,.06);overflow:hidden">
      <div style="background:#0b5fff;color:#fff;padding:18px 24px;">
        <h2 style="margin:0;font-weight:600;">Reporte de Visitas Oculares</h2>
        <div style="opacity:.9;font-size:14px">Fecha: ${prettyDate}</div>
      </div>

      <div style="padding:24px">
        <p style="margin:0 0 12px">Cordial saludo,</p>
        <p style="margin:0 0 16px">Adjunto encontrarán el archivo en formato Excel que contiene el detalle de las visitas procesadas correspondientes a la fecha indicada.</p>

        <div style="display:inline-block;background:#eef4ff;border:1px solid #d9e6ff;border-radius:10px;padding:14px 16px;margin:12px 0">
          <div style="font-size:13px;color:#3b5bcc;">Resumen</div>
          <div style="font-size:28px;font-weight:700;line-height:1;">${total ?? 0}</div>
          <div style="font-size:12px;color:#6a7aa6">Visitas</div>
        </div>

        <p style="margin:16px 0 0;font-size:13px;color:#5f6b7a">
          ${footerNote || "Este mensaje se generó automáticamente."}
        </p>
      </div>

      <div style="background:#fafbfc;border-top:1px solid #eef1f5;padding:14px 24px;color:#7b8794;font-size:12px">
        © ${new Date().getFullYear()} AFFI · Sistema de Reportes
      </div>
    </div>
  </div>`;
}

export function visitasAPEmailHTML({ prettyDate, total, footerNote }) {
  return `
  <div style="background:#fff7fa;padding:24px;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#222;">
    <div style="max-width:620px;margin:auto;background:#ffffff;border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,.06);overflow:hidden">

      <div style="background:#e4004f;color:#fff;padding:18px 24px;">
        <h2 style="margin:0;font-weight:600;">Reporte de Visitas</h2>
        <div style="opacity:.9;font-size:14px">Fecha: ${prettyDate}</div>
      </div>

      <div style="padding:24px">
        <p style="margin:0 0 12px">Cordial saludo,</p>

        <p style="margin:0 0 16px">
          Adjunto encontrarán el archivo en formato Excel que contiene el detalle
          de las visitas procesadas correspondientes a la fecha indicada.
        </p>

        <div style="display:inline-block;background:#fff0f5;border:1px solid #f8c7d8;border-radius:10px;padding:14px 16px;margin:12px 0">
          <div style="font-size:13px;color:#c90046;">
            Resumen
          </div>

          <div style="font-size:28px;font-weight:700;line-height:1;color:#222;">
            ${total ?? 0}
          </div>

          <div style="font-size:12px;color:#8a5366">
            Visitas
          </div>
        </div>

        <p style="margin:16px 0 0;font-size:13px;color:#8a5366">
          ${footerNote || "Este mensaje se generó automáticamente."}
        </p>
      </div>

      <div style="background:#fff8fa;border-top:1px solid #f3dce4;padding:14px 24px;color:#8c737c;font-size:12px">
        © ${new Date().getFullYear()} Alquiler Protegido · Sistema de Reportes
      </div>

    </div>
  </div>`;
}
