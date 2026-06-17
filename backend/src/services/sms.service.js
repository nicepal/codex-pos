const config = require('../config');
const logger = require('../utils/logger');

function smsConfigured() {
  return config.sms.provider === 'twilio'
    && config.sms.twilioAccountSid
    && config.sms.twilioAuthToken;
}

function whatsappConfigured() {
  if (config.whatsapp.provider === 'meta') {
    return Boolean(config.whatsapp.phoneNumberId && config.whatsapp.accessToken);
  }
  // Twilio also supports WhatsApp
  return config.sms.provider === 'twilio'
    && config.sms.twilioAccountSid
    && config.sms.twilioAuthToken
    && config.sms.whatsappFrom;
}

async function twilioSend({ to, from, body }) {
  const sid = config.sms.twilioAccountSid;
  const auth = Buffer.from(`${sid}:${config.sms.twilioAuthToken}`).toString('base64');
  const params = new URLSearchParams({ To: to, From: from, Body: body });
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || 'Twilio send failed');
  return { id: data.sid, provider: 'twilio' };
}

async function metaWhatsappSend({ to, body }) {
  const res = await fetch(
    `https://graph.facebook.com/v19.0/${config.whatsapp.phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.whatsapp.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body },
      }),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'WhatsApp send failed');
  return { id: data.messages?.[0]?.id, provider: 'meta' };
}

async function sendSms(to, body) {
  if (!to) throw new Error('Recipient phone number required');
  if (!smsConfigured()) {
    logger.info('[SMS:dev] would send', { to, body });
    return { delivered: false, simulated: true };
  }
  const result = await twilioSend({ to, from: config.sms.twilioFrom, body });
  return { delivered: true, ...result };
}

async function sendWhatsApp(to, body) {
  if (!to) throw new Error('Recipient phone number required');
  if (!whatsappConfigured()) {
    logger.info('[WhatsApp:dev] would send', { to, body });
    return { delivered: false, simulated: true };
  }
  if (config.whatsapp.provider === 'meta') {
    const result = await metaWhatsappSend({ to, body });
    return { delivered: true, ...result };
  }
  // Twilio WhatsApp uses the `whatsapp:` address prefix
  const result = await twilioSend({
    to: to.startsWith('whatsapp:') ? to : `whatsapp:${to}`,
    from: config.sms.whatsappFrom.startsWith('whatsapp:') ? config.sms.whatsappFrom : `whatsapp:${config.sms.whatsappFrom}`,
    body,
  });
  return { delivered: true, ...result };
}

module.exports = { sendSms, sendWhatsApp, smsConfigured, whatsappConfigured };
