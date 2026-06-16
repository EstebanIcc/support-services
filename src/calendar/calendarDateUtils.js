/**
 * @param {Date} date
 * @param {string} timeZone
 */
function getZonedYmd(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const get = (type) => parts.find((part) => part.type === type)?.value ?? "";

  return { year: get("year"), month: get("month"), day: get("day") };
}

/**
 * @param {{ year: string, month: string, day: string }} ymd
 */
function formatYmd(ymd) {
  return `${ymd.year}-${ymd.month}-${ymd.day}`;
}

/**
 * @param {string} ymd
 */
function parseYmd(ymd) {
  const [year, month, day] = ymd.split("-");
  return { year, month, day };
}

/**
 * @param {{ year: string, month: string, day: string }} ymd
 * @param {number} days
 */
function addDaysToYmd(ymd, days) {
  const date = new Date(
    Date.UTC(Number(ymd.year), Number(ymd.month) - 1, Number(ymd.day) + days)
  );

  return {
    year: String(date.getUTCFullYear()),
    month: String(date.getUTCMonth() + 1).padStart(2, "0"),
    day: String(date.getUTCDate()).padStart(2, "0"),
  };
}

/**
 * @param {string} ymd
 * @param {string} timeZone
 */
function getOffsetForYmd(ymd, timeZone) {
  const date = new Date(`${ymd}T12:00:00Z`);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "longOffset",
  }).formatToParts(date);

  const offset = parts.find((part) => part.type === "timeZoneName")?.value;
  if (!offset) return "Z";

  const match = offset.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);
  if (!match) return "Z";

  const sign = match[1];
  const hours = match[2].padStart(2, "0");
  const minutes = (match[3] ?? "00").padStart(2, "0");

  return `${sign}${hours}:${minutes}`;
}

/**
 * Rango desde hoy (o una fecha de inicio) durante N días calendario.
 *
 * @param {string} timeZone
 * @param {number} [days=7] Días incluidos (hoy cuenta como 1)
 * @param {string} [startDateYmd] YYYY-MM-DD
 */
export function resolveRangeFromToday(timeZone, days = 7, startDateYmd) {
  const todayYmd = formatYmd(getZonedYmd(new Date(), timeZone));
  const rangeStartYmd = startDateYmd ?? todayYmd;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(rangeStartYmd)) {
    throw new Error("date debe tener formato YYYY-MM-DD");
  }

  const dayCount = Number(days);
  if (!Number.isFinite(dayCount) || dayCount < 1) {
    throw new Error("days debe ser un número mayor o igual a 1");
  }

  const rangeEndYmd = formatYmd(
    addDaysToYmd(parseYmd(rangeStartYmd), dayCount - 1)
  );
  const startOffset = getOffsetForYmd(rangeStartYmd, timeZone);
  const endOffset = getOffsetForYmd(rangeEndYmd, timeZone);

  return {
    startDate: rangeStartYmd,
    endDate: rangeEndYmd,
    days: dayCount,
    timeMin: `${rangeStartYmd}T00:00:00${startOffset}`,
    timeMax: `${rangeEndYmd}T23:59:59${endOffset}`,
  };
}
