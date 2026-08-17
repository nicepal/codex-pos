/**
 * CodexPOS reference print agent — polls print job API and logs ESC/POS payload.
 * Configure API_KEY, API_URL, and optional PRINTER_HOST for a network ESC/POS printer.
 *
 * Usage:
 *   API_URL=http://localhost:5001/api/v1 API_KEY=cdx_your_key node index.js
 */
const API_URL = (process.env.API_URL || 'http://localhost:5001/api/v1').replace(/\/$/, '');
const API_KEY = process.env.API_KEY || '';
const POLL_MS = parseInt(process.env.POLL_MS, 10) || 3000;
const PRINTER_HOST = process.env.PRINTER_HOST || '';

if (!API_KEY) {
  console.error('Set API_KEY (business API key with print permissions).');
  process.exit(1);
}

async function claimJob() {
  const res = await fetch(`${API_URL}/print/jobs/claim`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    body: JSON.stringify({ agent_id: 'codexpos-print-agent' }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Claim failed ${res.status}: ${text}`);
  }
  const json = await res.json();
  return json.data || json;
}

async function completeJob(jobId) {
  await fetch(`${API_URL}/print/jobs/${jobId}/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    body: JSON.stringify({}),
  });
}

async function failJob(jobId, message) {
  await fetch(`${API_URL}/print/jobs/${jobId}/fail`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    body: JSON.stringify({ error: message }),
  });
}

async function sendToPrinter(payload) {
  if (!PRINTER_HOST) {
    console.log('[print-agent] No PRINTER_HOST — job payload:', JSON.stringify(payload).slice(0, 200));
    return;
  }
  // Network ESC/POS raw socket send is environment-specific; log for DIY wiring.
  console.log(`[print-agent] Would send to ${PRINTER_HOST}:`, payload?.content?.slice?.(0, 120) || payload);
}

async function loop() {
  try {
    const job = await claimJob();
    if (!job?.id) return;
    console.log(`[print-agent] Claimed job ${job.id}`);
    try {
      await sendToPrinter(job.payload || job);
      await completeJob(job.id);
      console.log(`[print-agent] Completed job ${job.id}`);
    } catch (err) {
      await failJob(job.id, err.message || 'print failed');
      console.error(`[print-agent] Failed job ${job.id}:`, err.message);
    }
  } catch (err) {
    console.error('[print-agent] Poll error:', err.message);
  }
}

console.log(`[print-agent] Polling ${API_URL}/print/jobs/claim every ${POLL_MS}ms`);
setInterval(loop, POLL_MS);
loop();
