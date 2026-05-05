import { fetchDatabaseRowsByTicket, fetchEmailReport } from "./jelouClient.js";

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
 * @param {any} elemento Primer elemento del grupo
 */
export function mapToTicketSummary(elemento) {
  const st = elemento.supportTicket ?? {};
  const assigned = st.assignedTo;
  console.log(assigned);
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
  const report = await fetchEmailReport(
    {
      page: query.page,
      limit: query.limit,
      status: query.status,
      companyId: query.companyId,
      sort: query.sort,
      botId: query.botId,
    },
    config
  );

  const results = Array.isArray(report.results) ? report.results : [];
  const byTicket = firstBySupportTicketId(results);

  const entries = [...byTicket.entries()];
  const merged = await Promise.all(
    entries.map(async ([supportTicketId, elemento]) => {
      const base = mapToTicketSummary(elemento);
      const ticketNum = base.ticket;

      let resumen = "";
      let resolucion = "";

      if (ticketNum != null) {
        try {
          const db = await fetchDatabaseRowsByTicket(ticketNum, config);
          const rows = Array.isArray(db.results) ? db.results : [];
          const first = rows[0];
          if (first) {
            resumen = first.Resumen_de_Caso ?? "";
            resolucion = first.Resolucion ?? "";
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
          Resumen_de_Caso: resumen,
          Resolucion: resolucion,
        },
      ];
    })
  );

  const out = Object.fromEntries(merged);

  return {
    sourcePagination: report.pagination ?? null,
    tickets: out,
  };
}
