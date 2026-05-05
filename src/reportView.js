/**
 * @param {string} s
 */
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * @param {string} s
 */
function nl2br(s) {
  return escapeHtml(s).replace(/\r\n|\r|\n/g, "<br>\n");
}

function generateReportId() {
  const stamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `RPT-${stamp}-${random}`;
}

/**
 * @param {{ sourcePagination?: object | null, tickets: Record<string, object> }} data
 */
export function renderReportHtml(data) {
  const pagination = data.sourcePagination;
  const tickets = data.tickets ?? {};
  const entries = Object.entries(tickets);
  const generatedAt = new Date().toLocaleString("es-EC", {
    dateStyle: "full",
    timeStyle: "medium",
  });
  const reportId = generateReportId();
  const totalCases = entries.length;
  const ticketNumbersHtml = entries
    .map(([, t]) => `<li>${escapeHtml(t.ticket ?? "—")}</li>`)
    .join("");

  const paginationBlock =
    pagination != null
      ? `<p class="meta">Página ${escapeHtml(pagination.page)} · ${escapeHtml(
          entries.length
        )} ticket(s) en esta vista · Total en origen: ${escapeHtml(
          pagination.total
        )}</p>`
      : "";

  const cards = entries
    .map(([supportTicketId, t]) => {
      const err =
        t._databaseError != null
          ? `<p class="warn">${nl2br(String(t._databaseError))}</p>`
          : "";

      return `
      <div class="sheet" id="ticket-${escapeHtml(supportTicketId)}">
        <article class="card">
          <header class="card-head">
            <span class="badge">#${escapeHtml(t.ticket ?? "—")}</span>
            <h2>${escapeHtml(t.subject || "(sin asunto)")}</h2>
          </header>
          <dl class="grid">
            <dt>ID soporte</dt><dd><code>${escapeHtml(supportTicketId)}</code></dd>
            <dt>Estado</dt><dd><span class="pill">${escapeHtml(t.status || "—")}</span></dd>
            <dt>Asignado a</dt><dd>${escapeHtml(t.assignedTo || "—")}</dd>
            <dt>Usuario</dt><dd>${escapeHtml(t.usuario || "—")}</dd>
            <dt>Creado</dt><dd>${escapeHtml(t.createdAt || "—")}</dd>
          </dl>
          <section class="block">
            <h3>Resumen del caso</h3>
            <div class="prose">${nl2br(t.Resumen_de_Caso || "—")}</div>
          </section>
          <section class="block">
            <h3>Resolución</h3>
            <div class="prose">${nl2br(t.Resolucion || "—")}</div>
          </section>
          ${err}
        </article>
      </div>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Casos consolidados</title>
  <style>
    @page {
      size: A4;
      margin: 14mm;
    }

    :root {
      --desk: #c5ccd6;
      --sheet-bg: #fff;
      --text: #1a1f26;
      --muted: #5c6570;
      --accent: #1a5f8a;
      --accent-soft: #1a5f8a;
      --border: #cfd6de;
      --pill-bg: #e8eef4;
      --warn-bg: #fff4e5;
      --warn-text: #7a4a12;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      font-family: system-ui, "Segoe UI", Roboto, sans-serif;
      background: var(--desk);
      color: var(--text);
      line-height: 1.45;
      padding: 1.25rem 0 2.5rem;
    }

    .page-head {
      max-width: 210mm;
      margin: 0 auto 1.25rem;
      padding: 0 12px;
      color: #2a3140;
    }

    .page-head h1 {
      margin: 0 0 0.35rem;
      font-size: 1.35rem;
      font-weight: 650;
    }

    .meta {
      margin: 0;
      color: var(--muted);
      font-size: 0.88rem;
    }

    .list {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.75rem;
    }

    .cover {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .cover-logo-wrap {
      display: flex;
      justify-content: center;
      margin-bottom: 1rem;
    }

    .cover-logo {
      width: min(240px, 62%);
      height: auto;
      display: block;
    }

    .cover-top h2 {
      margin: 0;
      font-size: 1.6rem;
      font-weight: 750;
      color: #172236;
    }

    .cover-subtitle {
      margin: 0.45rem 0 0;
      color: #4b5563;
      font-size: 0.94rem;
    }

    .cover-meta {
      margin-top: 1.8rem;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1rem 1.1rem;
      background: #fafcff;
      display: grid;
      grid-template-columns: 12rem 1fr;
      gap: 0.5rem 0.85rem;
      font-size: 0.92rem;
    }

    .cover-meta dt {
      margin: 0;
      color: var(--muted);
      font-weight: 600;
    }

    .cover-meta dd {
      margin: 0;
      color: #111827;
      font-weight: 500;
    }

    .cover-foot {
      margin-top: 2rem;
      border-top: 1px dashed #cbd5e1;
      padding-top: 0.7rem;
      color: #64748b;
      font-size: 0.84rem;
    }

    .cover-tickets {
      margin-top: 1rem;
    }

    .cover-tickets h3 {
      margin: 0 0 0.55rem;
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--muted);
      font-weight: 700;
    }

    .ticket-list {
      margin: 0;
      padding: 0;
      list-style: none;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(88px, 1fr));
      gap: 0.45rem;
    }

    .ticket-list li {
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 0.35rem 0.5rem;
      text-align: center;
      font-size: 0.86rem;
      font-weight: 650;
      color: #1f2937;
      background: #f8fafc;
    }

    /* Hoja A4 en pantalla: 210 × 297 mm */
    .sheet {
      width: 210mm;
      min-height: 297mm;
      max-width: calc(100vw - 24px);
      background: var(--sheet-bg);
      color: var(--text);
      padding: 16mm 18mm;
      box-shadow:
        0 1px 3px rgba(0,0,0,0.08),
        0 8px 28px rgba(0,0,0,0.12);
      border: 1px solid rgba(0,0,0,0.06);
    }

    .card {
      margin: 0;
      min-height: 100%;
    }

    .card-head {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 0.55rem 0.9rem;
      margin-bottom: 0.9rem;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid var(--border);
    }

    .card-head h2 {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 650;
      flex: 1 1 10rem;
      line-height: 1.35;
    }

    .badge {
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--accent);
      background: var(--pill-bg);
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      letter-spacing: 0.02em;
    }

    .grid {
      display: grid;
      grid-template-columns: 7.5rem 1fr;
      gap: 0.3rem 0.85rem;
      margin: 0 0 0.95rem;
      font-size: 0.86rem;
    }

    .grid dt {
      margin: 0;
      color: var(--muted);
      font-weight: 600;
    }

    .grid dd { margin: 0; }

    .grid code {
      font-size: 0.78rem;
      word-break: break-all;
      color: #334155;
    }

    .pill {
      display: inline-block;
      text-transform: capitalize;
      padding: 0.08rem 0.4rem;
      border-radius: 3px;
      background: var(--pill-bg);
      font-size: 0.82rem;
      font-weight: 500;
    }

    .block {
      margin-top: 0.85rem;
    }

    .block h3 {
      margin: 0 0 0.4rem;
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--muted);
      font-weight: 700;
    }

    .prose {
      font-size: 0.9rem;
      color: #2d3748;
      white-space: normal;
    }

    .warn {
      margin-top: 0.85rem;
      padding: 0.65rem 0.75rem;
      background: var(--warn-bg);
      color: var(--warn-text);
      border-radius: 6px;
      font-size: 0.86rem;
      border: 1px solid #e8c48a;
    }

    .empty {
      max-width: 210mm;
      margin: 2rem auto;
      text-align: center;
      color: var(--muted);
      padding: 0 12px;
    }

    @media print {
      body {
        background: #fff;
        color: #111827;
        padding: 0;
      }

      .no-print {
        display: none !important;
      }

      .list {
        gap: 0;
      }

      .sheet {
        width: 100%;
        max-width: none;
        min-height: 0;
        margin: 0;
        padding: 0;
        box-shadow: none;
        border: none;
        page-break-after: always;
        break-after: page;
      }

      .sheet:last-child {
        page-break-after: auto;
        break-after: auto;
      }

      .card-head {
        border-bottom-color: #ccc;
      }

      .sheet {
        color: #111827;
      }

      .prose {
        color: #1f2937;
      }
    }
  </style>
</head>
<body>
  <header class="page-head no-print">
    <h1>Casos consolidados</h1>
    ${paginationBlock}
  </header>
  ${
    entries.length === 0
      ? '<p class="empty">No hay tickets en esta consulta.</p>'
      : `<main class="list">
          <section class="sheet cover">
            <div class="cover-top">
              <div class="cover-logo-wrap">
                <img
                  class="cover-logo"
                  src="https://mintcdn.com/jelouai/ohdyHu3U1l_f83jb/assets/images/logo.svg?fit=max&auto=format&n=ohdyHu3U1l_f83jb&q=85&s=96492f65ef93712f99d972c31ad08e09"
                  alt="Logo Jelou"
                >
              </div>
              <h2>Reporte consolidado de casos</h2>
              <p class="cover-subtitle">Resumen general de casos obtenidos desde el canal de emails.</p>
              <dl class="cover-meta">
                <dt>Fecha de generación</dt><dd>${escapeHtml(generatedAt)}</dd>
                <dt>Reporte Id</dt><dd><code>${escapeHtml(reportId)}</code></dd>
                <dt>Canal</dt><dd>Emails</dd>
                <dt>Bot</dt><dd>Soporte Jelou Brain</dd>
                <dt>Total de casos</dt><dd>${escapeHtml(totalCases)}</dd>
              </dl>
              <section class="cover-tickets">
                <h3>Tickets obtenidos</h3>
                <ul class="ticket-list">${ticketNumbersHtml}</ul>
              </section>
            </div>
            <p class="cover-foot">Documento generado automáticamente por el servicio de consolidación.</p>
          </section>
          ${cards}
        </main>`
  }
</body>
</html>`;
}
