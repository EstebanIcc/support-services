import { createCanvas } from "@napi-rs/canvas";

/**
 * @param {unknown} value
 * @returns {number | null}
 */
export function parsePorcentaje(value) {
  if (typeof value !== "string") return null;
  const n = Number.parseFloat(value.replace("%", "").trim().replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/**
 * @typedef {{ cantidad_tickets?: number, porcentaje?: string }} SoporteEntry
 * @typedef {{ nombre: string, porcentaje: string, cantidad_tickets: number, porcentaje_num: number }} RankRow
 */

/**
 * @param {Record<string, SoporteEntry> | null | undefined} dataSoporte
 * @returns {RankRow[]}
 */
function parseAndSort(dataSoporte) {
  if (!dataSoporte || typeof dataSoporte !== "object") return [];
  const entries = Object.entries(dataSoporte).filter(
    ([, v]) => v && typeof v === "object"
  );

  /** @type {RankRow[]} */
  const parsed = [];
  for (const [nombre, raw] of entries) {
    const porcentaje =
      typeof raw.porcentaje === "string" ? raw.porcentaje : "0%";
    const porcentaje_num = parsePorcentaje(porcentaje);
    if (porcentaje_num === null) continue;
    const cantidad_tickets =
      typeof raw.cantidad_tickets === "number" &&
      Number.isFinite(raw.cantidad_tickets)
        ? raw.cantidad_tickets
        : 0;
    parsed.push({
      nombre,
      porcentaje,
      cantidad_tickets,
      porcentaje_num,
    });
  }

  parsed.sort((a, b) => {
    if (b.porcentaje_num !== a.porcentaje_num)
      return b.porcentaje_num - a.porcentaje_num;
    if (b.cantidad_tickets !== a.cantidad_tickets)
      return b.cantidad_tickets - a.cantidad_tickets;
    return a.nombre.localeCompare(b.nombre, "es");
  });

  return parsed;
}

/**
 * @param {Record<string, SoporteEntry> | null | undefined} dataSoporte
 * @returns {{ nombre: string, porcentaje: string, cantidad_tickets: number }[]}
 */
export function obtenerPodio(dataSoporte) {
  return parseAndSort(dataSoporte).slice(0, 3).map((r) => ({
    nombre: r.nombre,
    porcentaje: r.porcentaje,
    cantidad_tickets: r.cantidad_tickets,
  }));
}

/**
 * @param {Record<string, SoporteEntry> | null | undefined} dataSoporte
 * @returns {{ nombre: string, porcentaje: string, cantidad_tickets: number } | null}
 */
export function elegirGanador(dataSoporte) {
  const sorted = parseAndSort(dataSoporte);
  if (sorted.length === 0) return null;
  const top = sorted[0];
  return {
    nombre: top.nombre,
    porcentaje: top.porcentaje,
    cantidad_tickets: top.cantidad_tickets,
  };
}

/** Paleta marca Jelou / Brain Studio (podio). */
const THEME = {
  /** Fondo turquesa / cian (degradado en canvas). */
  bgEmerald: "#00A884",
  bgCyan: "#05BECF",
  bgDeepTeal: "#045a54",
  bgCyanDeep: "#048799",
  accent: "#00A884",
  accentMuted: "#006B56",
  accentBright: "#33D4B4",
  textPrimary: "#FFFFFF",
  textSecondary: "#B0B0B0",
  textTertiary: "#6E6E6E",
  borderSubtle: "rgba(255,255,255,0.08)",
  borderAccent: "rgba(0,168,132,0.35)",
};

/** @typedef {{ from: string, to: string }} PodioColors */

/** Degradados por puesto: 1.º verde marca; 2.º / 3.º tarjetas antracita. */
const PODIO_COLORS = {
  1: { from: "#00C9A0", to: "#007A62" },
  2: { from: "#2A2A2A", to: "#121212" },
  3: { from: "#242424", to: "#151515" },
};

/**
 * @param {import("@napi-rs/canvas").SKRSContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {number} r
 * @param {PodioColors} colors
 * @param {{ glow?: boolean, stroke?: string }} [opts]
 */
function fillRoundGradient(ctx, x, y, w, h, r, colors, opts = {}) {
  const glow = Boolean(opts.glow);
  const stroke = opts.stroke ?? THEME.borderSubtle;

  if (glow) {
    ctx.save();
    ctx.shadowColor = "rgba(0, 168, 132, 0.42)";
    ctx.shadowBlur = 36;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, colors.from);
  g.addColorStop(1, colors.to);
  ctx.fillStyle = g;
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.rect(x, y, w, h);
  }
  ctx.fill();

  if (glow) {
    ctx.restore();
  }

  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.rect(x, y, w, h);
  }
  ctx.stroke();
}

/**
 * @param {import("@napi-rs/canvas").SKRSContext2D} ctx
 * @param {string} text
 * @param {number} cx
 * @param {number} y
 * @param {number} maxWidth
 * @param {string} font
 */
function drawCenteredTruncated(ctx, text, cx, y, maxWidth, font) {
  const original = ctx.font;
  ctx.font = font;
  let line = text;
  if (ctx.measureText(line).width > maxWidth) {
    while (line.length > 1 && ctx.measureText(`${line}…`).width > maxWidth) {
      line = line.slice(0, -1);
    }
    line = `${line}…`;
  }
  const tw = ctx.measureText(line).width;
  ctx.fillText(line, cx - tw / 2, y);
  ctx.font = original;
}

/**
 * @param {import("@napi-rs/canvas").SKRSContext2D} ctx
 * @param {string} text
 * @param {number} x
 * @param {number} y
 * @param {number} maxWidth
 * @param {string} font
 */
function drawLeftTruncated(ctx, text, x, y, maxWidth, font) {
  const original = ctx.font;
  ctx.font = font;
  let line = text;
  if (ctx.measureText(line).width > maxWidth) {
    while (line.length > 1 && ctx.measureText(`${line}…`).width > maxWidth) {
      line = line.slice(0, -1);
    }
    line = `${line}…`;
  }
  ctx.fillText(line, x, y);
  ctx.font = original;
}

/**
 * "¡Felicitaciones, {nombre}!"; nombre en blanco resaltado (contraste sobre fondo turquesa).
 * @param {import("@napi-rs/canvas").SKRSContext2D} ctx
 * @param {string} nombre
 * @param {number} x
 * @param {number} y
 * @param {number} maxWidth
 */
function drawFelicitacionesBranded(ctx, nombre, x, y, maxWidth) {
  const prefix = "¡Felicitaciones, ";
  const suffix = "!";
  const fontMain = "700 30px sans-serif";
  const fontNombre = "800 30px sans-serif";
  ctx.font = fontMain;

  let nombreUse = nombre;
  const measureLine = () => {
    ctx.font = fontMain;
    const wPre = ctx.measureText(prefix).width;
    ctx.font = fontNombre;
    const wNom = ctx.measureText(nombreUse).width;
    ctx.font = fontMain;
    const wSuf = ctx.measureText(suffix).width;
    return wPre + wNom + wSuf;
  };

  while (nombreUse.length > 1 && measureLine() > maxWidth) {
    nombreUse = nombreUse.slice(0, -1);
  }
  if (measureLine() > maxWidth && nombreUse.length <= 1) {
    nombreUse = "…";
  } else if (measureLine() > maxWidth) {
    nombreUse = `${nombreUse.slice(0, -1)}…`;
  }

  let cursor = x;
  ctx.fillStyle = THEME.textPrimary;
  ctx.font = fontMain;
  ctx.fillText(prefix, cursor, y);
  cursor += ctx.measureText(prefix).width;

  ctx.fillStyle = THEME.textPrimary;
  ctx.font = fontNombre;
  ctx.fillText(nombreUse, cursor, y);
  cursor += ctx.measureText(nombreUse).width;

  ctx.fillStyle = THEME.textPrimary;
  ctx.font = fontMain;
  ctx.fillText(suffix, cursor, y);
}

/**
 * Cubre **todo el lienzo** con patrones en degradado turquesa / cian (#00A884 · #05BECF).
 * @param {import("@napi-rs/canvas").SKRSContext2D} ctx
 * @param {number} w
 * @param {number} h
 */
function fillTurquoiseCanvasBackground(ctx, w, h) {
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, THEME.bgDeepTeal);
  bg.addColorStop(0.28, THEME.bgEmerald);
  bg.addColorStop(0.55, THEME.bgCyan);
  bg.addColorStop(1, THEME.bgCyanDeep);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const bg2 = ctx.createLinearGradient(w, 0, 0, h);
  bg2.addColorStop(0, "rgba(5,190,207,0.28)");
  bg2.addColorStop(0.45, "rgba(0,168,132,0)");
  bg2.addColorStop(1, "rgba(4,87,84,0.42)");
  ctx.fillStyle = bg2;
  ctx.fillRect(0, 0, w, h);

  const glow = ctx.createRadialGradient(
    w * 0.9,
    h * 0.06,
    0,
    w * 0.72,
    h * 0.22,
    h * 1.05
  );
  glow.addColorStop(0, "rgba(255,255,255,0.2)");
  glow.addColorStop(0.5, "rgba(255,255,255,0)");
  glow.addColorStop(1, "rgba(5,190,207,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  const depth = ctx.createRadialGradient(
    w * 0.08,
    h * 1.02,
    0,
    w * 0.42,
    h * 0.78,
    h * 1.15
  );
  depth.addColorStop(0, "rgba(2,48,44,0.5)");
  depth.addColorStop(0.55, "rgba(0,168,132,0)");
  depth.addColorStop(1, "rgba(5,190,207,0.14)");
  ctx.fillStyle = depth;
  ctx.fillRect(0, 0, w, h);

  const sweep = ctx.createLinearGradient(0, h * 0.25, w, h * 0.75);
  sweep.addColorStop(0, "rgba(5,190,207,0.18)");
  sweep.addColorStop(0.48, "rgba(0,168,132,0.06)");
  sweep.addColorStop(1, "rgba(4,135,152,0.22)");
  ctx.fillStyle = sweep;
  ctx.fillRect(0, 0, w, h);
}

/**
 * @param {{
 *   etiquetaSeccion: string,
 *   podio: { nombre: string, porcentaje: string, cantidad_tickets: number }[]
 * }} opts
 * @returns {Buffer}
 */
export function renderPodioPng(opts) {
  const w = 1200;
  const h = 720;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext("2d");

  fillTurquoiseCanvasBackground(ctx, w, h);

  /** Marco ligero sin relleno oscuro: el patrón cubre el 100 % del lienzo. */
  const pad = 20;
  const rx = 18;
  ctx.strokeStyle = "rgba(255,255,255,0.28)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(pad, pad, w - pad * 2, h - pad * 2, rx);
  } else {
    ctx.rect(pad, pad, w - pad * 2, h - pad * 2);
  }
  ctx.stroke();

  ctx.save();
  ctx.shadowColor = "rgba(0, 35, 32, 0.55)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = THEME.textPrimary;
  ctx.font = "600 26px sans-serif";
  ctx.fillText(opts.etiquetaSeccion, 60, 72);

  const primero = opts.podio[0];
  if (primero) {
    drawFelicitacionesBranded(ctx, primero.nombre, 60, 110, w - 120);
  }

  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = "22px sans-serif";
  ctx.fillText("Podio · mayor % de tickets resueltos", 60, 150);
  ctx.restore();

  const floorY = 600;
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(48, floorY);
  ctx.lineTo(w - 48, floorY);
  ctx.stroke();

  const podio = opts.podio;
  const pw = 200;
  const gap = 28;
  const r = 14;

  /**
   * @param {number} rank
   * @param {{ nombre: string, porcentaje: string, cantidad_tickets: number }} p
   * @param {{ x: number, blockH: number }} geom
   */
  function dibujarBloque(rank, p, geom) {
    const colors = PODIO_COLORS[/** @type {1|2|3} */ (rank)];
    const topY = floorY - geom.blockH;
    const isFirst = rank === 1;
    fillRoundGradient(ctx, geom.x, topY, pw, geom.blockH, r, colors, {
      glow: isFirst,
      stroke: isFirst ? THEME.borderAccent : THEME.borderSubtle,
    });

    const cx = geom.x + pw / 2;
    const lugar = rank === 1 ? "1°" : rank === 2 ? "2°" : "3°";
    ctx.fillStyle = THEME.textPrimary;
    ctx.font = "800 36px sans-serif";
    const lw = ctx.measureText(lugar).width;
    ctx.fillText(lugar, cx - lw / 2, topY + 44);

    ctx.fillStyle = THEME.textPrimary;
    ctx.font = "700 22px sans-serif";
    drawCenteredTruncated(ctx, p.nombre, cx, topY + 86, pw - 24, "700 22px sans-serif");

    ctx.font = "600 18px sans-serif";
    ctx.fillStyle = isFirst ? "rgba(255,255,255,0.88)" : THEME.textSecondary;
    drawCenteredTruncated(
      ctx,
      p.porcentaje,
      cx,
      topY + 118,
      pw - 24,
      "600 18px sans-serif"
    );

    ctx.font = "14px sans-serif";
    ctx.fillStyle = isFirst ? "rgba(255,255,255,0.72)" : THEME.textTertiary;
    const sub = `${p.cantidad_tickets} tickets`;
    drawCenteredTruncated(ctx, sub, cx, topY + 146, pw - 24, "14px sans-serif");
  }

  if (podio.length === 0) {
    return canvas.toBuffer("image/png");
  }

  if (podio.length === 1) {
    const groupW = pw;
    const x0 = (w - groupW) / 2;
    dibujarBloque(1, podio[0], { x: x0, blockH: 300 });
  } else if (podio.length === 2) {
    const groupW = pw * 2 + gap;
    const startX = (w - groupW) / 2;
    dibujarBloque(2, podio[1], { x: startX, blockH: 220 });
    dibujarBloque(1, podio[0], { x: startX + pw + gap, blockH: 280 });
  } else {
    const groupW = pw * 3 + gap * 2;
    const startX = (w - groupW) / 2;
    dibujarBloque(2, podio[1], { x: startX, blockH: 220 });
    dibujarBloque(1, podio[0], { x: startX + pw + gap, blockH: 300 });
    dibujarBloque(3, podio[2], { x: startX + (pw + gap) * 2, blockH: 165 });
  }

  return canvas.toBuffer("image/png");
}

/**
 * @param {{ data_soporte?: Record<string, SoporteEntry>, total_tickets?: number } | null | undefined} bloque
 * @param {string} etiquetaSeccion
 * @returns {{ ganador: { nombre: string, porcentaje: string, cantidad_tickets: number }, podio: { nombre: string, porcentaje: string, cantidad_tickets: number }[], png: Buffer } | { error: string }}
 */
export function imagenParaBloque(bloque, etiquetaSeccion) {
  if (!bloque || typeof bloque !== "object") {
    return { error: "Bloque ausente o inválido." };
  }
  const podio = obtenerPodio(bloque.data_soporte);
  const ganador = podio[0] ?? null;
  if (!ganador) {
    return {
      error: "No hay datos en data_soporte para calcular un podio.",
    };
  }
  const png = renderPodioPng({ etiquetaSeccion, podio });
  return { ganador, podio, png };
}
