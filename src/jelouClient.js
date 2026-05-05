const GATEWAY_BASE = "http://gateway.jelou.ai/jelouapi/v1";
const API_BASE = "https://api.jelou.ai/v2";

/**
 * @param {object} opts
 * @param {object} config
 */
export async function fetchEmailReport(opts, config) {
  const {
    page = 1,
    limit = 50,
    status = "PENDING",
    companyId,
    sort = "ASC",
    botId,
  } = opts;

  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    status: String(status),
    companyId: String(companyId ?? config.defaultCompanyId),
    sort: String(sort),
    botId: String(botId ?? config.defaultBotId),
  });

  const url = `${GATEWAY_BASE}/utils/emails/report?${params.toString()}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      timezone: config.timezone,
      "x-api-key": config.gatewayApiKey,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Email report ${res.status}: ${text.slice(0, 500)}`);
  }

  return res.json();
}

/**
 * @param {number|string} ticketNumber
 * @param {object} config
 */
export async function fetchDatabaseRowsByTicket(ticketNumber, config) {
  const params = new URLSearchParams({
    search: String(ticketNumber),
    searchBy: "Ticket",
  });

  const databaseId = config.databaseId;
  const url = `${API_BASE}/databases/${databaseId}/rows?${params.toString()}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Basic ${config.databaseBasicAuth}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Database rows ${res.status}: ${text.slice(0, 500)}`);
  }

  return res.json();
}
