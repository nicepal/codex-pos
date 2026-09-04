const db = require('../../config/database');
const { ValidationError } = require('../../shared/errors');

function money(amount, currency) {
  const n = Number(amount);
  const safe = Number.isFinite(n) ? n.toFixed(2) : '0.00';
  return currency ? `${safe} ${currency}` : safe;
}

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function nonzero(val) {
  return Number(val) > 0;
}

function cashierName(user) {
  if (!user) return null;
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  return name || user.email || null;
}

function splitProductName(item) {
  const name = item.product_name || '';
  if (item.variant_id && name.includes(' - ')) {
    const idx = name.indexOf(' - ');
    return { title: name.slice(0, idx), variant: name.slice(idx + 3) };
  }
  return { title: name, variant: null };
}

function paymentLabel(method) {
  if (!method) return null;
  const map = {
    cash: 'Cash',
    card: 'Card',
    bank: 'Bank',
    gift_card: 'Gift card',
    other: 'Other',
    split: 'Split',
  };
  return map[method] || String(method);
}

function buildReceiptHtml(data) {
  const { business, branch, order, items, payments, footer, currency } = data;
  const isRefund = order?.status === 'refunded';
  const title = isRefund ? 'REFUND' : 'SALE';
  const cashier = cashierName(order?.created_by_user);
  const customer = order?.customer;
  const when = order?.created_at ? new Date(order.created_at).toLocaleString() : '';

  const itemRows = (items || []).map((item) => {
    const { title: productTitle, variant } = splitProductName(item);
    return `
      <div class="row item">
        <div class="item-main">
          <div class="item-name">${esc(productTitle)}</div>
          ${variant ? `<div class="item-variant">${esc(variant)}</div>` : ''}
          <div class="item-qty">${esc(item.quantity)} × ${esc(money(item.unit_price, null))}</div>
        </div>
        <div class="item-total">${esc(money(item.total, null))}</div>
      </div>`;
  }).join('');

  const summaryLines = [];
  if (order?.subtotal != null) {
    summaryLines.push(`<div class="row"><span>Subtotal</span><span>${esc(money(order.subtotal, null))}</span></div>`);
  }
  if (nonzero(order?.discount_amount)) {
    summaryLines.push(`<div class="row"><span>Discount</span><span>-${esc(money(order.discount_amount, null))}</span></div>`);
  }
  if (nonzero(order?.tax_amount)) {
    summaryLines.push(`<div class="row"><span>Tax</span><span>${esc(money(order.tax_amount, null))}</span></div>`);
  }
  if (nonzero(order?.tip_amount)) {
    summaryLines.push(`<div class="row"><span>Tip</span><span>${esc(money(order.tip_amount, null))}</span></div>`);
  }

  let paymentBlock = '';
  if (payments?.length > 1) {
    paymentBlock = payments.map((p) => (
      `<div class="row"><span>${esc(paymentLabel(p.payment_method))}</span><span>${esc(money(p.amount, null))}</span></div>`
    )).join('');
  } else if (payments?.length === 1) {
    paymentBlock = `<div class="row"><span>${esc(paymentLabel(payments[0].payment_method))}</span><span>${esc(money(payments[0].amount, null))}</span></div>`;
  } else if (order?.payment_method) {
    paymentBlock = `<div class="row"><span>${esc(paymentLabel(order.payment_method))}</span><span>${esc(money(order.total_amount, null))}</span></div>`;
  }

  const contactBits = [
    branch?.address || business?.address,
    branch?.phone || business?.phone,
  ].filter(Boolean);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>${esc(title)} ${esc(order?.order_number || '')}</title>
<style>
  @page { margin: 0; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 8px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 12px;
    color: #000;
    background: #fff;
  }
  .receipt { width: 80mm; max-width: 100%; margin: 0 auto; }
  .receipt--58 { width: 58mm; }
  .center { text-align: center; }
  .muted { color: #000; opacity: 0.75; font-size: 11px; }
  .biz-name { font-size: 15px; font-weight: 700; margin: 0 0 2px; }
  .logo { max-width: 72px; max-height: 48px; margin: 0 auto 6px; display: block; }
  .rule { border: 0; border-top: 1px dashed #000; margin: 8px 0; }
  .title { font-size: 13px; font-weight: 700; letter-spacing: 0.08em; margin: 4px 0; }
  .row { display: flex; justify-content: space-between; gap: 8px; align-items: flex-start; }
  .item { margin-bottom: 6px; }
  .item-main { flex: 1; min-width: 0; }
  .item-name { font-weight: 600; }
  .item-variant { font-size: 11px; }
  .item-qty { font-size: 11px; }
  .item-total { font-weight: 600; white-space: nowrap; }
  .total-row { font-size: 14px; font-weight: 800; margin-top: 4px; }
  .footer { margin-top: 10px; }
  .powered { margin-top: 8px; font-size: 10px; opacity: 0.7; }
  @media print {
    body { padding: 0; }
    * { animation: none !important; transition: none !important; color: #000 !important; background: #fff !important; }
  }
</style>
</head>
<body>
  <div class="receipt receipt--80 print-receipt">
    <div class="center">
      ${business?.logo_url ? `<img class="logo" src="${esc(business.logo_url)}" alt=""/>` : ''}
      <div class="biz-name">${esc(business?.name || '')}</div>
      ${branch?.name ? `<div>${esc(branch.name)}</div>` : ''}
      ${contactBits.map((b) => `<div class="muted">${esc(b)}</div>`).join('')}
    </div>
    <hr class="rule"/>
    <div class="center title">${esc(title)}</div>
    <div>
      ${order?.order_number ? `<div class="row"><span>Order</span><span>${esc(order.order_number)}</span></div>` : ''}
      ${when ? `<div class="row"><span>Date</span><span>${esc(when)}</span></div>` : ''}
      ${cashier ? `<div class="row"><span>Cashier</span><span>${esc(cashier)}</span></div>` : ''}
      ${branch?.name ? `<div class="row"><span>Branch</span><span>${esc(branch.name)}</span></div>` : ''}
    </div>
    <hr class="rule"/>
    ${itemRows}
    <hr class="rule"/>
    ${summaryLines.join('')}
    <div class="row total-row"><span>TOTAL</span><span>${esc(money(order?.total_amount, currency))}</span></div>
    ${paymentBlock ? `<hr class="rule"/>${paymentBlock}` : ''}
    ${customer ? `
      <hr class="rule"/>
      <div><strong>Customer</strong></div>
      ${customer.name ? `<div>${esc(customer.name)}</div>` : ''}
      ${customer.phone ? `<div class="muted">${esc(customer.phone)}</div>` : ''}
      ${customer.email ? `<div class="muted">${esc(customer.email)}</div>` : ''}
    ` : ''}
    <div class="footer center">
      <div>${esc(footer || 'Thank you for your purchase!')}</div>
      <div class="powered">Powered by PosHive</div>
    </div>
  </div>
</body>
</html>`;
}

class PrintService {
  async createReceiptJob(tenantId, { order_id: orderId, printer, width } = {}) {
    if (!orderId) throw new ValidationError('order_id is required');

    const orderService = require('../orders/orders.service');
    const receipt = await orderService.getReceipt(tenantId, orderId);
    const order = receipt.order;
    const currency = receipt.business?.currency || order.currency || '';
    const items = receipt.items || [];
    const payments = receipt.payments || [];

    const lines = [];
    lines.push('\x1B\x40'); // ESC @ init
    lines.push('\x1B\x61\x01'); // center
    lines.push(`${receipt.business?.name || 'Receipt'}\n`);
    if (receipt.branch?.name) lines.push(`${receipt.branch.name}\n`);
    lines.push('\x1B\x61\x00'); // left
    lines.push(`Order: ${order.order_number}\n`);
    lines.push(`Date: ${new Date(order.created_at).toISOString()}\n`);
    const cashier = cashierName(order.created_by_user);
    if (cashier) lines.push(`Cashier: ${cashier}\n`);
    lines.push('--------------------------------\n');
    for (const item of items) {
      const { title, variant } = splitProductName(item);
      lines.push(`${item.quantity} x ${title}\n`);
      if (variant) lines.push(`  ${variant}\n`);
      lines.push(`  ${Number(item.unit_price).toFixed(2)}  ${Number(item.total).toFixed(2)}\n`);
    }
    lines.push('--------------------------------\n');
    if (order.subtotal != null) lines.push(`Subtotal: ${Number(order.subtotal).toFixed(2)}\n`);
    if (nonzero(order.discount_amount)) lines.push(`Discount: ${Number(order.discount_amount).toFixed(2)}\n`);
    if (nonzero(order.tax_amount)) lines.push(`Tax:      ${Number(order.tax_amount).toFixed(2)}\n`);
    if (nonzero(order.tip_amount)) lines.push(`Tip:      ${Number(order.tip_amount).toFixed(2)}\n`);
    lines.push(`TOTAL:    ${Number(order.total_amount).toFixed(2)} ${currency}\n`);
    if (payments.length > 1) {
      for (const p of payments) {
        lines.push(`${paymentLabel(p.payment_method)}: ${Number(p.amount).toFixed(2)}\n`);
      }
    } else if (order.payment_method) {
      lines.push(`Paid: ${paymentLabel(order.payment_method)}\n`);
    }
    if (order.customer?.name) lines.push(`Customer: ${order.customer.name}\n`);
    lines.push(`\n${receipt.footer || 'Thank you!'}\n`);
    lines.push('Powered by PosHive\n');
    lines.push('\x1D\x56\x00'); // partial cut

    const html = buildReceiptHtml({
      business: receipt.business,
      branch: receipt.branch,
      order,
      items,
      payments,
      footer: receipt.footer,
      currency,
    });

    const payload = {
      order_id: orderId,
      order_number: order.order_number,
      printer: printer || null,
      width: width === '58' ? '58' : '80',
      encoding: 'escpos',
      text: lines.join(''),
      html,
    };

    const result = await db.query(
      `INSERT INTO print_jobs (tenant_id, job_type, payload, status)
       VALUES ($1, 'receipt', $2::jsonb, 'queued') RETURNING *`,
      [tenantId, JSON.stringify(payload)]
    );

    const row = result.rows[0];
    return {
      ...row,
      html,
      text: payload.text,
      delivery: {
        browser_html: true,
        escpos_queued: true,
        note: 'HTML is returned for browser/OS print. ESC-POS payload stays queued until a print agent claims it via POST /print/jobs/claim.',
      },
    };
  }

  /**
   * Print-agent drain: claim oldest queued job (SKIP LOCKED).
   * Without an agent, jobs remain queued — browser print uses returned HTML instead.
   */
  async claimNextJob(tenantId, { agent_id: agentId } = {}) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      const job = await client.query(
        `SELECT * FROM print_jobs
         WHERE tenant_id = $1 AND status = 'queued'
         ORDER BY created_at ASC
         LIMIT 1
         FOR UPDATE SKIP LOCKED`,
        [tenantId]
      );
      if (!job.rows[0]) {
        await client.query('COMMIT');
        return null;
      }
      const prev = typeof job.rows[0].payload === 'object' && job.rows[0].payload
        ? job.rows[0].payload
        : {};
      const payload = {
        ...prev,
        claimed_by: agentId || null,
        claimed_at: new Date().toISOString(),
      };
      const updated = await client.query(
        `UPDATE print_jobs SET status = 'claimed', payload = $2::jsonb
         WHERE id = $1 AND tenant_id = $3 RETURNING *`,
        [job.rows[0].id, JSON.stringify(payload), tenantId]
      );
      await client.query('COMMIT');
      return updated.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async completeJob(tenantId, jobId, { agent_id: agentId } = {}) {
    const result = await db.query(
      `UPDATE print_jobs
       SET status = 'completed',
           payload = COALESCE(payload, '{}'::jsonb) || $3::jsonb
       WHERE id = $1 AND tenant_id = $2 AND status IN ('queued', 'claimed', 'printing')
       RETURNING *`,
      [jobId, tenantId, JSON.stringify({ completed_at: new Date().toISOString(), completed_by: agentId || null })]
    );
    if (!result.rows[0]) throw new ValidationError('Print job not found or already finished');
    return result.rows[0];
  }

  async failJob(tenantId, jobId, { error, agent_id: agentId } = {}) {
    const result = await db.query(
      `UPDATE print_jobs
       SET status = 'failed',
           payload = COALESCE(payload, '{}'::jsonb) || $3::jsonb
       WHERE id = $1 AND tenant_id = $2 AND status IN ('queued', 'claimed', 'printing')
       RETURNING *`,
      [
        jobId,
        tenantId,
        JSON.stringify({
          failed_at: new Date().toISOString(),
          failed_by: agentId || null,
          error: error || 'Print agent reported failure',
        }),
      ]
    );
    if (!result.rows[0]) throw new ValidationError('Print job not found or already finished');
    return result.rows[0];
  }

  async listJobs(tenantId, query = {}) {
    const page = parseInt(query.page, 10) || 1;
    const limit = Math.min(parseInt(query.limit, 10) || 50, 100);
    const offset = (page - 1) * limit;
    const count = await db.query(
      `SELECT COUNT(*)::int AS total FROM print_jobs WHERE tenant_id = $1`,
      [tenantId]
    );
    const rows = await db.query(
      `SELECT * FROM print_jobs WHERE tenant_id = $1
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [tenantId, limit, offset]
    );
    const total = count.rows[0].total;
    return { rows: rows.rows, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 } };
  }
}

module.exports = new PrintService();
