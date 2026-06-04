#!/usr/bin/env node
/**
 * Prueba envío WhatsApp con las variables del .env o del entorno.
 * Uso: node scripts/test-whatsapp.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const { getWhatsAppConfig } = require("../lib/config");
const { sendWhatsAppMessage, normalizePhoneE164 } = require("../lib/alerts/whatsapp");

async function main() {
  const cfg = getWhatsAppConfig();
  console.log("\n=== Config WhatsApp ===");
  console.log("Provider:", cfg.provider || "(vacío)");
  console.log("Enabled:", cfg.enabled);
  if (cfg.misconfigured) console.log("⚠️  Faltan credenciales Twilio/Cloud API");
  if (cfg.to) console.log("WHATSAPP_TO normalizado:", normalizePhoneE164(cfg.to));
  if (cfg.from) console.log("TWILIO_WHATSAPP_FROM:", cfg.from);

  if (!cfg.enabled) {
    console.error("\nERROR: WhatsApp no está configurado. Revisá variables de entorno.");
    process.exit(1);
  }

  console.log("\n=== Enviando mensaje de prueba ===");
  const result = await sendWhatsAppMessage(
    "Prueba Alucraft desde script local.\nSi ves esto, WhatsApp funciona."
  );
  console.log("OK:", result);
}

main().catch((err) => {
  console.error("\nFALLÓ:", err.message);
  process.exit(1);
});
