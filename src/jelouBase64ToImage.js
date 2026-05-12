const BASE64_TO_IMAGE_URL =
  "https://functions.jelou.ai/minitools/base64-to-image";

/**
 * Envía un PNG en Base64 (sin prefijo `data:image/png;base64,`) al servicio Jelou
 * y devuelve la URL pública del recurso (`mediaUrl`).
 *
 * @param {string} base64 Contenido binario codificado en Base64
 * @returns {Promise<string>}
 */
export async function uploadPngBase64ToMediaUrl(base64) {
  const res = await fetch(BASE64_TO_IMAGE_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ base64 }),
  });

  const text = await res.text();
  /** @type {{ message?: string, mediaUrl?: string }} */
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      `base64-to-image: respuesta no JSON (${res.status}): ${text.slice(0, 240)}`
    );
  }

  if (!res.ok) {
    const message =
      typeof data.message === "string"
        ? data.message
        : `HTTP ${res.status}: ${text.slice(0, 320)}`;
    throw new Error(message);
  }

  const mediaUrl = data.mediaUrl;
  if (typeof mediaUrl !== "string" || !mediaUrl.trim()) {
    throw new Error("base64-to-image: la respuesta no incluye mediaUrl válido");
  }

  return mediaUrl.trim();
}
