import express from "express";
import { loadConfig } from "./config.js";
import { runEnrichmentPipeline } from "./pipeline.js";
import { renderReportHtml } from "./reportView.js";
import { listCalendarEvents } from "./calendar/calendarService.js";

const config = loadConfig();
const app = express();

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

/**
 * GET /api/casos/consolidados
 * Query: page, limit, companyId, sort, botId (mismos que el gateway de correos).
 * Se consultan en paralelo OPEN, PENDING y RESOLVED; la respuesta unifica tickets.
 */
app.get("/api/casos/consolidados", async (req, res) => {
  try {
    const data = await runEnrichmentPipeline(config, req.query);
    res.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.includes("Falta variable") ? 500 : 502;
    res.status(status).json({ error: message });
  }
});

/**
 * GET /vista/casos
 * Misma query que /api/casos/consolidados (sin filtro por status); HTML listo para compartir.
 */
/**
 * GET /api/calendar/eventos
 * Query: days (default 7), date (inicio YYYY-MM-DD, default hoy), limit.
 * Eventos desde hoy hasta N días, agrupados por attendee.
 */
app.get("/api/calendar/eventos", async (req, res) => {
  try {
    const data = await listCalendarEvents(config, req.query);
    res.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.includes("Falta variable") ? 500 : 502;
    res.status(status).json({ error: message });
  }
});

app.get("/vista/casos", async (req, res) => {
  try {
    const data = await runEnrichmentPipeline(config, req.query);
    res.type("html").send(renderReportHtml(data));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.includes("Falta variable") ? 500 : 502;
    res
      .status(status)
      .type("html")
      .send(
        `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Error</title></head><body style="font-family:sans-serif;padding:2rem;"><h1>No se pudo generar el reporte</h1><pre style="white-space:pre-wrap;">${String(
          message
        ).replace(/</g, "&lt;")}</pre></body></html>`
      );
  }
});

app.listen(config.port, () => {
  console.log(`Servidor en http://localhost:${config.port}`);
  console.log(`  GET /api/casos/consolidados`);
  console.log(`  GET /api/calendar/eventos`);
  console.log(`  GET /vista/casos`);
});
