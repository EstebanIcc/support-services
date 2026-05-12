import { fetchDatabaseRowsByTicket, fetchEmailReport } from "./jelouClient.js";

/** Estados que se consultan en paralelo al gateway de correos. */
export const EMAIL_REPORT_STATUSES = ["OPEN", "PENDING", "RESOLVED"];

/**
 * Toma el primer resultado por supportTicketId (orden del array original).
 * @param {any[]} results
 * @returns {Map<string, any>}
 */
export function firstBySupportTicketId(results) {
  const map = new Map();
  for (const item of results) {
    const id = item.supportTicketId;
    if (id == null) continue;
    const key = String(id);
    if (!map.has(key)) {
      map.set(key, item);
    }
  }
  return map;
}

/**
 * @param {Record<string, unknown>} row
 */
function companyFromDbRow(row) {
  if (!row || typeof row !== "object") return "";
  const raw =
    row.Compañia ??
    row.Compañía ??
    row.Company ??
    row.company ??
    row.Empresa ??
    row.empresa ??
    row.Compania ??
    "";
  if (raw == null) return "";
  return typeof raw === "string" ? raw : String(raw);
}

/**
 * @param {any} elemento Primer elemento del grupo
 */
export function mapToTicketSummary(elemento) {
  const st = elemento.supportTicket ?? {};
  const assigned = st.assignedTo;
  const user = st.user;
  const assignedEmail =
    typeof assigned === "object" && assigned && "names" in assigned
      ? assigned.names
      : "";
  const userEmail =
    typeof user === "object" && user && "email" in user ? user.email : "";

  return {
    subject: elemento.subject ?? "",
    ticket: st.number ?? null,
    status: st.status ?? "",
    assignedTo: assignedEmail,
    usuario: userEmail,
    createdAt: st.createdAt ?? null,
  };
}

/**
 * @param {import('./config.js').AppConfig} config
 * @param {Record<string, string | undefined>} query
 */
export async function runEnrichmentPipeline(config, query) {
  const baseOpts = {
    page: query.page,
    limit: query.limit,
    companyId: query.companyId,
    sort: query.sort,
    botId: query.botId,
  };

  const reports = await Promise.all(
    EMAIL_REPORT_STATUSES.map((status) =>
      fetchEmailReport({ ...baseOpts, status }, config)
    )
  );

  /** Último resultado gana si hubiera duplicado de supportTicketId entre listas. */
  const byTicket = new Map();
  for (const report of reports) {
    const results = Array.isArray(report.results) ? report.results : [];
    for (const item of results) {
      const id = item.supportTicketId;
      if (id == null) continue;
      byTicket.set(String(id), item);
    }
  }

  const entries = [...byTicket.entries()];
  const merged = await Promise.all(
    entries.map(async ([supportTicketId, elemento]) => {
      const base = mapToTicketSummary(elemento);
      const ticketNum = base.ticket;

      let resumen = "";
      let resolucion = "";
      let company = "";

      if (ticketNum != null) {
        try {
          const db = await fetchDatabaseRowsByTicket(ticketNum, config);
          const rows = Array.isArray(db.results) ? db.results : [];
          const first = rows[0];
          if (first) {
            resumen = first.Resumen_de_Caso ?? "";
            resolucion = first.Resolucion ?? "";
            company = companyFromDbRow(first);
          }
        } catch (e) {
          base._databaseError =
            e instanceof Error ? e.message : String(e);
        }
      }

      return [
        supportTicketId,
        {
          ...base,
          company,
          Resumen_de_Caso: resumen,
          Resolucion: resolucion,
        },
      ];
    })
  );

  const out = Object.fromEntries(merged);

  return {
    sourcePagination: {
      mergedFromStatuses: [...EMAIL_REPORT_STATUSES],
      byStatus: Object.fromEntries(
        EMAIL_REPORT_STATUSES.map((st, i) => [st, reports[i].pagination ?? null])
      ),
    },
    tickets: out,
  };
}
