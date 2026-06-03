const { getWhatsAppConfig } = require("../config");

function normalizePhoneE164(phone) {
  const raw = String(phone).trim();
  if (raw.startsWith("whatsapp:")) {
    return raw;
  }
  if (raw.startsWith("+")) {
    return raw;
  }
  return `+${raw.replace(/\D/g, "")}`;
}

async function sendTwilioWhatsApp(config, body) {
  const to = normalizePhoneE164(config.to);
  const from = config.from.startsWith("whatsapp:") ? config.from : `whatsapp:${config.from}`;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`;
  const auth = Buffer.from(`${config.accountSid}:${config.authToken}`).toString("base64");

  const params = new URLSearchParams({
    To: to.startsWith("whatsapp:") ? to : `whatsapp:${to}`,
    From: from,
    Body: body,
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(`Twilio WhatsApp error ${response.status}: ${JSON.stringify(payload)}`);
  }

  return { provider: "twilio", sid: payload.sid };
}

async function sendCloudApiWhatsApp(config, body) {
  const to = normalizePhoneE164(config.to).replace(/^\+/, "");

  const url = `https://graph.facebook.com/v21.0/${config.phoneNumberId}/messages`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body },
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(`WhatsApp Cloud API error ${response.status}: ${JSON.stringify(payload)}`);
  }

  return { provider: "cloud_api", messageId: payload.messages?.[0]?.id };
}

/**
 * Sends a WhatsApp message if configured. Returns null when disabled (no throw).
 */
async function sendWhatsAppMessage(body) {
  const config = getWhatsAppConfig();

  if (!config.enabled) {
    if (config.misconfigured) {
      console.warn("WhatsApp configurado pero faltan credenciales", {
        provider: config.provider,
      });
    }
    return null;
  }

  if (config.provider === "twilio") {
    return sendTwilioWhatsApp(config, body);
  }

  if (config.provider === "cloud_api") {
    return sendCloudApiWhatsApp(config, body);
  }

  console.warn("WHATSAPP_PROVIDER desconocido", { provider: config.provider });
  return null;
}

module.exports = { sendWhatsAppMessage, normalizePhoneE164 };
