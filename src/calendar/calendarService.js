import { fetchAllCalendarEvents } from "./calendarClient.js";
import { resolveRangeFromToday } from "./calendarDateUtils.js";
import { loadAttendeesFilter } from "./attendeesFilter.js";

/**
 * @param {import("../config.js").AppConfig} config
 */
function requireCalendarConfig(config) {
  if (!config.googleCalendarId) {
    throw new Error("Falta variable de entorno obligatoria: GOOGLE_CALENDAR_ID");
  }
}

/**
 * @param {import("googleapis").calendar_v3.Schema$EventDateTime | null | undefined} dateTime
 */
function getEventStartValue(dateTime) {
  if (!dateTime) return "";
  return dateTime.dateTime ?? dateTime.date ?? "";
}

/**
 * @param {import("googleapis").calendar_v3.Schema$Event} a
 * @param {import("googleapis").calendar_v3.Schema$Event} b
 */
function compareEventsByStart(a, b) {
  return getEventStartValue(a.start).localeCompare(getEventStartValue(b.start));
}

/**
 * @param {import("googleapis").calendar_v3.Schema$Event} event
 */
function mapEventForAttendee(event) {
  return {
    id: event.id,
    summary: event.summary ?? null,
    description: event.description ?? null,
    start: event.start ?? null,
    end: event.end ?? null,
    created: event.created ?? null,
    updated: event.updated ?? null,
  };
}

/**
 * @param {import("googleapis").calendar_v3.Schema$Event[]} rawEvents
 * @param {Map<string, string>} allowedAttendees email -> idSlack
 */
function groupEventsByAttendee(rawEvents, allowedAttendees) {
  /** @type {Map<string, { email: string, slackId: string, displayName: string | null, events: object[] }>} */
  const byAttendee = new Map();

  for (const event of rawEvents) {
    const attendees = event.attendees?.length > 0 ? event.attendees : [];

    for (const attendee of attendees) {
      const email = attendee.email?.trim().toLowerCase();
      if (!email || !allowedAttendees.has(email)) {
        continue;
      }

      const slackId = allowedAttendees.get(email);
      const key = email;

      if (!byAttendee.has(key)) {
        byAttendee.set(key, {
          email: attendee.email ?? email,
          slackId,
          displayName: attendee.displayName ?? null,
          events: [],
        });
      }

      byAttendee.get(key).events.push(mapEventForAttendee(event));
    }
  }

  return Array.from(byAttendee.values())
    .map((group) => ({
      email: group.email,
      slackId: group.slackId,
      displayName: group.displayName,
      eventCount: group.events.length,
      events: group.events.sort(compareEventsByStart),
    }))
    .sort((a, b) => a.email.toLowerCase().localeCompare(b.email.toLowerCase()));
}

/**
 * @param {import("../config.js").AppConfig} config
 * @param {Record<string, string | undefined>} query
 */
export async function listCalendarEvents(config, query) {
  requireCalendarConfig(config);

  const days = query.days ? Number(query.days) : 7;
  const range = resolveRangeFromToday(config.timezone, days, query.date);
  const timeMin = query.timeMin ?? range.timeMin;
  const timeMax = query.timeMax ?? range.timeMax;

  const allowedAttendees = loadAttendeesFilter(config);

  const rawEvents = await fetchAllCalendarEvents(
    {
      timeMin,
      timeMax,
      maxResults: query.limit ? Number(query.limit) : 250,
    },
    config
  );

  const attendees = groupEventsByAttendee(rawEvents, allowedAttendees);

  return {
    calendarId: config.googleCalendarId,
    timezone: config.timezone,
    startDate: range.startDate,
    endDate: range.endDate,
    days: range.days,
    timeMin,
    timeMax,
    eventCount: rawEvents.length,
    attendeeCount: attendees.length,
    attendees,
  };
}
