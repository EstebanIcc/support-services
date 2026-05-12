import express from "express";
import { loadConfig } from "./config.js";
import { imagenParaBloque } from "./felicitacionImage.js";
import { uploadPngBase64ToMediaUrl } from "./jelouBase64ToImage.js";
import { runEnrichmentPipeline } from "./pipeline.js";
import { renderReportHtml } from "./reportView.js";

/**
 * @param {{ ganador: object, podio: object[], png: Buffer }} out
 */
async function respuestaBloqueConImagen(out) {
  const imagenBase64 = out.png.toString("base64");
  try {
    const mediaUrl = await uploadPngBase64ToMediaUrl(imagenBase64);
    return {
      ok: true,
      ganador: out.ganador,
      podio: out.podio,
      imagenBase64,
      mediaUrl,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: true,
      ganador: out.ganador,
      podio: out.podio,
      imagenBase64,
      mediaUrl: null,
      uploadError: message,
    };
  }
}

const config = loadConfig();
const app = express();

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

/**
 * GET /api/casos/consolidados
 * Query: page, limit, status, companyId, sort, botId (mismos que el gateway de correos)
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
 * POST /api/felicitacion/imagenes
 * Body: `{ resultado_ticket?, resultado_pma?, resultado_tickets? }` (alias opcional para tickets).
 * Genera una imagen PNG por sección y sube cada una a Jelou (`base64-to-image`); incluye `mediaUrl`.
 */
app.post("/api/felicitacion/imagenes", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};

    const bloqueTicket =
      body.resultado_ticket ?? body.resultado_tickets ?? undefined;
    const bloquePma = body.resultado_pma;

    /** @type {Record<string, unknown>} */
    const payload = {};

    if (bloqueTicket === undefined) {
      payload.resultado_ticket = {
        ok: false,
        error: "Falta resultado_ticket (o alias resultado_tickets).",
      };
    } else {
      const out = imagenParaBloque(bloqueTicket, "Tickets · resultado_ticket");
      if ("error" in out) {
        payload.resultado_ticket = { ok: false, error: out.error };
      } else {
        payload.resultado_ticket = await respuestaBloqueConImagen(out);
      }
    }

    if (bloquePma === undefined) {
      payload.resultado_pma = {
        ok: false,
        error: "Falta resultado_pma.",
      };
    } else {
      const out = imagenParaBloque(bloquePma, "PMA · resultado_pma");
      if ("error" in out) {
        payload.resultado_pma = { ok: false, error: out.error };
      } else {
        payload.resultado_pma = await respuestaBloqueConImagen(out);
      }
    }

    res.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

/**
 * GET /vista/casos
 * Misma query que /api/casos/consolidados; devuelve HTML listo para compartir el enlace.
 */

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
  console.log(`  POST /api/felicitacion/imagenes`);
  console.log(`  GET /vista/casos`);
});
