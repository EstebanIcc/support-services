import "dotenv/config";

function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Falta variable de entorno obligatoria: ${name}`);
  }
  return v;
}

export function loadConfig() {
  return {
    port: Number(process.env.PORT) || 3000,
    gatewayApiKey: requireEnv("JELOU_GATEWAY_API_KEY"),
    databaseBasicAuth: requireEnv("JELOU_DATABASE_BASIC_AUTH"),
    defaultCompanyId: process.env.DEFAULT_COMPANY_ID ?? "5",
    defaultBotId:
      process.env.DEFAULT_BOT_ID ??
      "9e84df74-0dc2-4fcf-9308-cd4257f7d978",
    databaseId: process.env.DATABASE_ID ?? "5372",
    timezone: process.env.JELOU_TIMEZONE ?? "America/Guayaquil",
  };
}

/** @typedef {ReturnType<typeof loadConfig>} AppConfig */
