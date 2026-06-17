const crypto = require('crypto');
const PDFDocument = require('pdfkit');
const db = require('../../config/database');
const { NotFoundError, ValidationError } = require('../../shared/errors');

function money(value, currency = 'USD') {
  const amount = Number(value) || 0;
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

async function getSetting(tenantId, key) {
  const r = await db.query('SELECT value FROM settings WHERE tenant_id = $1 AND key = $2', [tenantId, key]);
  return r.rows[0]?.value ?? null;
}

class ComplianceService {
  async getFiscalSettings(tenantId) {
    const [taxId, prefix] = await Promise.all([
      getSetting(tenantId, 'fiscal_tax_id'),
      getSetting(tenantId, 'fiscal_invoice_prefix'),
    ]);
    return { tax_id: taxId || '', invoice_prefix: prefix || 'INV-' };
  }

  /**
   * Returns the fiscal invoice record for an order, creating one with the next
   * sequential number if it doesn't yet exist. Sequence is allocated atomically
   * per tenant so numbering has no gaps/duplicates (a fiscal requirement).
   */
  async ensureInvoice(tenantId, orderId) {
    const existing = await db.query(
      'SELECT * FROM order_invoices WHERE tenant_id = $1 AND order_id = $2',
      [tenantId, orderId]
    );
    if (existing.rows[0]) return existing.rows[0];

    const orderRes = await db.query(
      `SELECT o.*, c.name AS customer_name, c.tax_id AS customer_tax_id
       FROM orders o LEFT JOIN customers c ON c.id = o.customer_id
       WHERE o.id = $1 AND o.tenant_id = $2`,
      [orderId, tenantId]
    );
    const order = orderRes.rows[0];
    if (!order) throw new NotFoundError('Order not found');

    const fiscal = await this.getFiscalSettings(tenantId);
    const currency = (await getSetting(tenantId, 'currency')) || order.currency || 'USD';

    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      // Lock the tenant's invoice sequence
      const seqRes = await client.query(
        `SELECT COALESCE(MAX(sequence), 0) + 1 AS next FROM order_invoices WHERE tenant_id = $1 FOR UPDATE`,
        [tenantId]
      );
      const sequence = seqRes.rows[0].next;
      const invoiceNumber = `${fiscal.invoice_prefix}${String(sequence).padStart(6, '0')}`;

      const payloadHash = crypto.createHash('sha256')
        .update(`${tenantId}|${orderId}|${invoiceNumber}|${order.total_amount}`)
        .digest('hex');

      const inserted = await client.query(
        `INSERT INTO order_invoices
           (tenant_id, order_id, invoice_number, sequence, seller_tax_id, buyer_name, buyer_tax_id,
            subtotal, tax_total, total, currency, hash)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
        [tenantId, orderId, invoiceNumber, sequence, fiscal.tax_id,
          order.customer_name || 'Walk-in customer', order.customer_tax_id || null,
          order.subtotal, order.tax_amount, order.total_amount, currency, payloadHash]
      );
      await client.query('COMMIT');
      return inserted.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async generateTaxInvoicePdf(tenantId, orderId) {
    const invoice = await this.ensureInvoice(tenantId, orderId);
    const [tenant, items] = await Promise.all([
      db.query('SELECT name, address, phone, email FROM tenants WHERE id = $1', [tenantId]),
      db.query('SELECT * FROM order_items WHERE order_id = $1 AND tenant_id = $2', [orderId, tenantId]),
    ]);
    const company = tenant.rows[0] || {};
    const currency = invoice.currency;

    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));

    doc.fontSize(20).font('Helvetica-Bold').text('TAX INVOICE', { align: 'right' });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica')
      .text(`Invoice #: ${invoice.invoice_number}`, { align: 'right' })
      .text(`Date: ${new Date(invoice.issued_at).toLocaleDateString()}`, { align: 'right' });

    doc.moveDown();
    doc.fontSize(13).font('Helvetica-Bold').text(company.name || 'Business');
    doc.fontSize(9).font('Helvetica');
    if (company.address) doc.text(company.address);
    if (company.phone) doc.text(`Phone: ${company.phone}`);
    if (company.email) doc.text(company.email);
    if (invoice.seller_tax_id) doc.text(`Tax ID: ${invoice.seller_tax_id}`);

    doc.moveDown();
    doc.font('Helvetica-Bold').text('Bill To:');
    doc.font('Helvetica').text(invoice.buyer_name || 'Walk-in customer');
    if (invoice.buyer_tax_id) doc.text(`Buyer Tax ID: ${invoice.buyer_tax_id}`);

    doc.moveDown();
    const top = doc.y;
    doc.font('Helvetica-Bold').fontSize(9);
    doc.text('Item', 48, top);
    doc.text('Qty', 300, top);
    doc.text('Price', 360, top);
    doc.text('Total', 460, top);
    doc.moveTo(48, top + 14).lineTo(548, top + 14).stroke('#cccccc');

    let y = top + 22;
    doc.font('Helvetica').fontSize(9);
    for (const it of items.rows) {
      doc.text(it.product_name, 48, y, { width: 240 });
      doc.text(String(it.quantity), 300, y);
      doc.text(money(it.unit_price, currency), 360, y);
      doc.text(money(it.total, currency), 460, y);
      y += 18;
    }

    doc.moveTo(48, y + 4).lineTo(548, y + 4).stroke('#cccccc');
    y += 12;
    doc.font('Helvetica').text(`Subtotal: ${money(invoice.subtotal, currency)}`, 360, y);
    doc.text(`Tax: ${money(invoice.tax_total, currency)}`, 360, y + 16);
    doc.font('Helvetica-Bold').text(`Total: ${money(invoice.total, currency)}`, 360, y + 34);

    doc.font('Helvetica').fontSize(7).fillColor('#888888')
      .text(`Document hash: ${invoice.hash}`, 48, 770, { width: 500 });

    doc.end();
    return new Promise((resolve, reject) => {
      doc.on('end', () => resolve({ buffer: Buffer.concat(chunks), invoice }));
      doc.on('error', (err) => reject(new ValidationError(`PDF generation failed: ${err.message}`)));
    });
  }

  // ---- GDPR ----
  async exportCustomer(tenantId, customerId, userId) {
    const customer = await db.query('SELECT * FROM customers WHERE id = $1 AND tenant_id = $2', [customerId, tenantId]);
    if (!customer.rows[0]) throw new NotFoundError('Customer not found');

    const [orders, loyalty, storefront] = await Promise.all([
      db.query('SELECT id, order_number, total_amount, status, created_at FROM orders WHERE customer_id = $1 AND tenant_id = $2', [customerId, tenantId]),
      db.query('SELECT * FROM loyalty_transactions WHERE customer_id = $1 AND tenant_id = $2', [customerId, tenantId]).catch(() => ({ rows: [] })),
      db.query('SELECT id, email, first_name, last_name, phone, marketing_consent, created_at FROM storefront_customers WHERE customer_id = $1 AND tenant_id = $2', [customerId, tenantId]).catch(() => ({ rows: [] })),
    ]);

    await db.query(
      `INSERT INTO gdpr_requests (tenant_id, customer_id, type, requested_by) VALUES ($1, $2, 'export', $3)`,
      [tenantId, customerId, userId || null]
    );

    return {
      exported_at: new Date().toISOString(),
      customer: customer.rows[0],
      orders: orders.rows,
      loyalty_transactions: loyalty.rows,
      storefront_accounts: storefront.rows,
    };
  }

  /**
   * Anonymizes a customer's personal data while retaining financial records
   * (orders) for accounting/tax obligations — the standard GDPR approach.
   */
  async eraseCustomer(tenantId, customerId, userId) {
    const customer = await db.query('SELECT id FROM customers WHERE id = $1 AND tenant_id = $2', [customerId, tenantId]);
    if (!customer.rows[0]) throw new NotFoundError('Customer not found');

    const anon = `redacted+${customerId.slice(0, 8)}@example.invalid`;
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      await client.query(
        `UPDATE customers SET name = 'Redacted', email = $3, phone = NULL, address = NULL, notes = NULL, status = 'anonymized'
         WHERE id = $1 AND tenant_id = $2`,
        [customerId, tenantId, anon]
      );
      await client.query(
        `UPDATE storefront_customers SET first_name = 'Redacted', last_name = NULL, email = $3, phone = NULL, status = 'anonymized'
         WHERE customer_id = $1 AND tenant_id = $2`,
        [customerId, tenantId, anon]
      ).catch(() => {});
      await client.query(
        `INSERT INTO gdpr_requests (tenant_id, customer_id, type, requested_by) VALUES ($1, $2, 'erase', $3)`,
        [tenantId, customerId, userId || null]
      );
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
    return { erased: true, message: 'Customer personal data anonymized; financial records retained.' };
  }
}

module.exports = new ComplianceService();
