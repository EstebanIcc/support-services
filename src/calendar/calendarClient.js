import { readFileSync } from "node:fs";
import { google } from "googleapis";

const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";

/** @type {import("google-auth-library").JWT | null} */
let cachedAuth = null;

/**
 * @param {import("../config.js").AppConfig} config
 */
function loadServiceAccountCredentials(config) {
  if (config.googleServiceAccountKeyPath) {
    try {
      return JSON.parse(
        readFileSync(config.googleServiceAccountKeyPath, "utf8")
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(
        `No se pudo leer GOOGLE_SERVICE_ACCOUNT_KEY_PATH: ${message}`
      );
    }
  }

  if (config.googleServiceAccountKey) {
    try {
      return JSON.parse(config.googleServiceAccountKey);
    } catch {
      throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY no contiene JSON válido");
    }
  }

  throw new Error(
    "Falta GOOGLE_SERVICE_ACCOUNT_KEY_PATH o GOOGLE_SERVICE_ACCOUNT_KEY"
  );
}

/**
 * @param {import("../config.js").AppConfig} config
 */
function getAuthClient(config) {
  if (cachedAuth) {
    return cachedAuth;
  }

  const credentials = loadServiceAccountCredentials(config);

  cachedAuth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: [CALENDAR_SCOPE],
  });

  return cachedAuth;
}

/**
 * @param {object} opts
 * @param {string} [opts.timeMin] ISO 8601
 * @param {string} [opts.timeMax] ISO 8601
 * @param {number} [opts.maxResults]
 * @param {string} [opts.pageToken]
 * @param {import("../config.js").AppConfig} config
 */
export async function fetchCalendarEvents(opts, config) {
  const auth = getAuthClient(config);
  const calendar = google.calendar({ version: "v3", auth });

  try {
    const res = await calendar.events.list({
      calendarId: config.googleCalendarId,
      timeMin: opts.timeMin,
      timeMax: opts.timeMax,
      maxResults: opts.maxResults ?? 250,
      singleEvents: true,
      orderBy: "startTime",
      pageToken: opts.pageToken,
    });

    return res.data;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Calendar events: ${message}`);
  }
}

/**
 * @param {object} opts
 * @param {string} opts.timeMin
 * @param {string} opts.timeMax
 * @param {number} [opts.maxResults]
 * @param {import("../config.js").AppConfig} config
 */
export async function fetchAllCalendarEvents(opts, config) {
  /** @type {import("googleapis").calendar_v3.Schema$Event[]} */
  const items = [];
  let pageToken;

  do {
    const data = await fetchCalendarEvents({ ...opts, pageToken }, config);
    if (data.items?.length) {
      items.push(...data.items);
    }
    pageToken = data.nextPageToken ?? undefined;
  } while (pageToken);

  return items;
}
