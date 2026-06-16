import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_FILTER_PATH = resolve(__dirname, "attendeesFilter.json");

/** @type {Map<string, string> | null} */
let cachedFilter = null;

/**
 * @param {unknown} entry
 * @returns {entry is { email: string, idSlack: string }}
 */
function isValidEntry(entry) {
  return (
    typeof entry === "object" &&
    entry !== null &&
    typeof entry.email === "string" &&
    entry.email.trim() !== "" &&
    typeof entry.idSlack === "string" &&
    entry.idSlack.trim() !== ""
  );
}

/**
 * @param {import("../config.js").AppConfig} config
 */
export function loadAttendeesFilter(config) {
  if (cachedFilter) {
    return cachedFilter;
  }

  const filterPath = resolve(
    process.cwd(),
    config.calendarAttendeesFilterPath ?? DEFAULT_FILTER_PATH
  );

  let raw;
  try {
    raw = JSON.parse(readFileSync(filterPath, "utf8"));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`No se pudo leer attendees filter (${filterPath}): ${message}`);
  }

  const entries = Array.isArray(raw) ? raw : raw?.attendees;
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error("attendees filter debe ser un arreglo o tener la clave attendees");
  }

  /** @type {Map<string, string>} */
  const byEmail = new Map();

  for (const entry of entries) {
    if (!isValidEntry(entry)) {
      throw new Error(
        "Cada attendee debe incluir email e idSlack como strings no vacíos"
      );
    }

    const email = entry.email.trim().toLowerCase();
    byEmail.set(email, entry.idSlack.trim());
  }

  cachedFilter = byEmail;
  return byEmail;
}
