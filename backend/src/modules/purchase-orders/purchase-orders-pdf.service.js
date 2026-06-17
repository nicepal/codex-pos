const PDFDocument = require('pdfkit');
const db = require('../../config/database');
const { NotFoundError, ValidationError } = require('../../shared/errors');

function parseSettingValue(value) {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function money(value, currency = 'USD') {
  const amount = Number(value) || 0;
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function safeDate(date) {
  if (!date) return '—';
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

class PurchaseOrderPdfService {
  async _fetchPayload(tenantId, poId) {
    const po = await db.query(
      `SELECT po.*, s.name AS supplier_name, s.contact_person, s.phone AS supplier_phone, s.email AS supplier_email, s.address AS supplier_address,
              u.first_name, u.last_name, u.email AS generated_user_email
       FROM purchase_orders po
       LEFT JOIN suppliers s ON s.id = po.supplier_id AND s.tenant_id = po.tenant_id
       LEFT JOIN users u ON u.id = po.created_by
       WHERE po.id = $1 AND po.tenant_id = $2`,
      [poId, tenantId]
    );
    if (!po.rows[0]) throw new NotFoundError('Purchase order not found');
    if (!po.rows[0].supplier_name) throw new ValidationError('Supplier information is missing');

    const items = await db.query(
      `SELECT poi.*, p.name AS product_name, p.sku
       FROM purchase_order_items poi
       LEFT JOIN products p ON p.id = poi.product_id
       WHERE poi.purchase_order_id = $1 AND poi.tenant_id = $2
       ORDER BY poi.created_at ASC`,
      [poId, tenantId]
    );

    const tenant = await db.query(
      `SELECT name, address, city, state, country, postal_code, phone, email, logo_url, currency
       FROM tenants WHERE id = $1`,
      [tenantId]
    );
    if (!tenant.rows[0]) throw new NotFoundError('Business not found');

    const settings = await db.query(
      `SELECT key, value FROM settings WHERE tenant_id = $1 AND key IN ('website', 'purchase_terms')`,
      [tenantId]
    );
    const map = Object.fromEntries(settings.rows.map((r) => [r.key, parseSettingValue(r.value)]));

    return {
      po: po.rows[0],
      items: items.rows,
      company: tenant.rows[0],
      website: map.website || '—',
      terms: map.purchase_terms || 'Goods supplied must match agreed specifications and quantity.',
    };
  }

  _drawTableHeader(doc, y) {
    const columns = [
      { label: '#', x: 42, w: 20, align: 'left' },
      { label: 'Product', x: 64, w: 140, align: 'left' },
      { label: 'SKU', x: 206, w: 70, align: 'left' },
      { label: 'Qty', x: 278, w: 40, align: 'right' },
      { label: 'Unit Cost', x: 320, w: 70, align: 'right' },
      { label: 'Tax', x: 392, w: 45, align: 'right' },
      { label: 'Discount', x: 439, w: 55, align: 'right' },
      { label: 'Line Total', x: 496, w: 60, align: 'right' },
    ];
    doc.font('Helvetica-Bold').fontSize(9);
    doc.rect(40, y - 4, 515, 20).stroke('#D0D5DD');
    for (const col of columns) {
      doc.text(col.label, col.x, y + 2, { width: col.w, align: col.align });
    }
    return y + 22;
  }

  async generatePdfBuffer(tenantId, poId) {
    const payload = await this._fetchPayload(tenantId, poId);
    const { po, items, company, website, terms } = payload;
    const currency = company.currency || 'USD';

    const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));

    const line = (label, value, x, y, width = 240) => {
      doc.font('Helvetica-Bold').fontSize(9).text(`${label}:`, x, y, { width: 85 });
      doc.font('Helvetica').fontSize(9).text(value || '—', x + 85, y, { width: width - 85 });
    };

    const companyAddress = [company.address, company.city, company.state, company.country, company.postal_code].filter(Boolean).join(', ');
    const companyName = company.name || 'Business';

    doc.font('Helvetica-Bold').fontSize(20).text('PURCHASE ORDER', 40, 42, { align: 'right' });
    doc.font('Helvetica-Bold').fontSize(14).text(companyName, 40, 40, { width: 300 });
    doc.font('Helvetica').fontSize(9).text(companyAddress || '—', 40, 60, { width: 300 });
    doc.text(`Phone: ${company.phone || '—'}`, 40, 74);
    doc.text(`Email: ${company.email || '—'}`, 40, 86);
    doc.text(`Website: ${website || '—'}`, 40, 98);

    doc.moveTo(40, 118).lineTo(555, 118).stroke('#D0D5DD');

    line('PO Number', po.po_number, 40, 130, 250);
    line('PO Date', safeDate(po.ordered_at || po.created_at), 40, 144, 250);
    line('Expected Delivery', po.expected_delivery_date ? safeDate(po.expected_delivery_date) : '—', 40, 158, 250);
    line('Status', (po.status || '').toUpperCase(), 40, 172, 250);

    line('Supplier Name', po.supplier_name, 315, 130, 240);
    line('Contact Person', po.contact_person || '—', 315, 144, 240);
    line('Phone', po.supplier_phone || '—', 315, 158, 240);
    line('Email', po.supplier_email || '—', 315, 172, 240);
    line('Address', po.supplier_address || '—', 315, 186, 240);

    doc.moveTo(40, 208).lineTo(555, 208).stroke('#D0D5DD');

    let y = this._drawTableHeader(doc, 220);
    const rowHeight = 18;
    const pageBottom = 730;
    let subtotal = 0;
    let discount = 0;
    let tax = 0;
    let shipping = 0;

    items.forEach((item, idx) => {
      const qty = Number(item.quantity) || 0;
      const unitCost = Number(item.unit_cost) || 0;
      const lineDiscount = Number(item.discount || 0);
      const lineTax = Number(item.tax || 0);
      const lineTotal = Number(item.total_cost || (qty * unitCost));
      subtotal += qty * unitCost;
      discount += lineDiscount;
      tax += lineTax;

      if (y + rowHeight > pageBottom) {
        doc.addPage();
        y = this._drawTableHeader(doc, 60);
      }

      doc.font('Helvetica').fontSize(9);
      doc.rect(40, y - 2, 515, rowHeight).stroke('#EAECF0');
      doc.text(String(idx + 1), 42, y + 3, { width: 20 });
      doc.text(item.product_name || 'Product', 64, y + 3, { width: 140 });
      doc.text(item.sku || '—', 206, y + 3, { width: 70 });
      doc.text(String(qty), 278, y + 3, { width: 40, align: 'right' });
      doc.text(money(unitCost, currency), 320, y + 3, { width: 70, align: 'right' });
      doc.text(money(lineTax, currency), 392, y + 3, { width: 45, align: 'right' });
      doc.text(money(lineDiscount, currency), 439, y + 3, { width: 55, align: 'right' });
      doc.text(money(lineTotal, currency), 496, y + 3, { width: 60, align: 'right' });
      y += rowHeight;
    });

    const grandTotal = Number(po.total_amount || (subtotal - discount + tax + shipping));
    if (y + 180 > pageBottom) {
      doc.addPage();
      y = 70;
    } else {
      y += 16;
    }

    doc.font('Helvetica-Bold').fontSize(10).text('Summary', 340, y);
    y += 14;
    const summaryRow = (label, value) => {
      doc.font('Helvetica').fontSize(9).text(label, 380, y, { width: 90, align: 'right' });
      doc.text(money(value, currency), 480, y, { width: 75, align: 'right' });
      y += 14;
    };
    summaryRow('Subtotal', subtotal);
    summaryRow('Discount', discount);
    summaryRow('Tax', tax);
    summaryRow('Shipping', shipping);
    doc.font('Helvetica-Bold');
    summaryRow('Grand Total', grandTotal);

    y += 12;
    doc.font('Helvetica-Bold').fontSize(10).text('Purchase Notes', 40, y);
    doc.font('Helvetica').fontSize(9).text(po.notes || '—', 40, y + 14, { width: 515 });
    y += 46;
    doc.font('Helvetica-Bold').fontSize(10).text('Terms & Conditions', 40, y);
    doc.font('Helvetica').fontSize(9).text(terms, 40, y + 14, { width: 515 });

    y += 74;
    if (y > 680) {
      doc.addPage();
      y = 70;
    }

    const generatedBy = [po.first_name, po.last_name].filter(Boolean).join(' ') || po.generated_user_email || 'System User';
    doc.font('Helvetica').fontSize(9).text(`Generated By: ${generatedBy}`, 40, y);
    doc.text(`Generated On: ${new Date().toLocaleString()}`, 40, y + 14);
    doc.text('Company Stamp', 40, y + 54);
    doc.rect(40, y + 68, 200, 70).stroke('#D0D5DD');
    doc.text('Authorized Signature', 315, y + 54);
    doc.rect(315, y + 68, 200, 70).stroke('#D0D5DD');

    const pageRange = doc.bufferedPageRange();
    for (let i = 0; i < pageRange.count; i += 1) {
      doc.switchToPage(i);
      doc.font('Helvetica').fontSize(8).fillColor('#667085')
        .text(`Page ${i + 1} of ${pageRange.count}`, 40, 800, { width: 515, align: 'center' });
    }

    doc.end();
    return new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(new ValidationError(`PDF generation failed: ${err.message}`)));
    });
  }
}

module.exports = new PurchaseOrderPdfService();
