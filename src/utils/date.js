import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";

dayjs.extend(customParseFormat);

/**
 * Valida una fecha con formato YYYY-MM-DD.
 */
export function isValidDate(date) {
  if (!date || typeof date !== "string") {
    return false;
  }

  return dayjs(date, "YYYY-MM-DD", true).isValid();
}

/**
 * Valida que month y year puedan formar una fecha válida.
 *
 * month: 1 - 12
 * year: YYYY
 */
export function isValidMonthYear(month, year) {
  if (!month || !year) {
    return false;
  }

  const monthNumber = Number(month);
  const yearNumber = Number(year);

  if (
    !Number.isInteger(monthNumber) ||
    !Number.isInteger(yearNumber)
  ) {
    return false;
  }

  if (!/^\d{4}$/.test(String(year))) {
    return false;
  }

  const formattedMonth = String(monthNumber).padStart(2, "0");

  const date = `${year}-${formattedMonth}-01`;

  return dayjs(date, "YYYY-MM-DD", true).isValid();
}