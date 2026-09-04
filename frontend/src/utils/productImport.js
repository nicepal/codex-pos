import * as XLSX from 'xlsx';

/** Columns accepted by POST /products/import */
export const PRODUCT_IMPORT_COLUMNS = [
  'name',
  'sku',
  'barcode',
  'sale_price',
  'cost_price',
  'stock_quantity',
  'status',
  'category',
  'brand',
  'description',
];

export const PRODUCT_IMPORT_SAMPLE_ROWS = [
  {
    name: 'Example T-Shirt',
    sku: 'SKU-001',
    barcode: '1234567890123',
    sale_price: 29.99,
    cost_price: 12.5,
    stock_quantity: 100,
    status: 'active',
    category: 'Apparel',
    brand: 'Demo Brand',
    description: 'Soft cotton tee',
  },
  {
    name: 'Example Coffee Mug',
    sku: 'SKU-002',
    barcode: '',
    sale_price: 14.99,
    cost_price: 4,
    stock_quantity: 50,
    status: 'active',
    category: 'Home',
    brand: '',
    description: 'Ceramic 350ml mug',
  },
];

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Download a sample .xlsx Excel file for bulk product import. */
export function downloadProductImportSampleExcel() {
  const sheet = XLSX.utils.json_to_sheet(PRODUCT_IMPORT_SAMPLE_ROWS, {
    header: PRODUCT_IMPORT_COLUMNS,
  });
  sheet['!cols'] = PRODUCT_IMPORT_COLUMNS.map((key) => ({
    wch: Math.max(12, key.length + 2),
  }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Products');
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  downloadBlob(
    new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    'poshive-products-import-sample.xlsx',
  );
}

function normalizeHeader(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

function sheetRowsToObjects(matrix) {
  if (!matrix?.length) return { rows: [], errors: ['File is empty'] };
  const headers = matrix[0].map(normalizeHeader);
  if (!headers.includes('name') && !headers.includes('sku')) {
    return { rows: [], errors: ['Header row must include name and/or sku'] };
  }

  const rows = [];
  const errors = [];
  for (let i = 1; i < matrix.length; i += 1) {
    const cols = matrix[i] || [];
    if (cols.every((c) => c == null || String(c).trim() === '')) continue;
    const row = {};
    headers.forEach((h, idx) => {
      if (!h) return;
      const raw = cols[idx];
      if (raw === undefined || raw === null || String(raw).trim() === '') return;
      row[h] = typeof raw === 'string' ? raw.trim() : raw;
    });
    if (!row.name && !row.sku) {
      errors.push(`Row ${i + 1}: name or sku required`);
      continue;
    }
    rows.push(row);
  }
  return { rows, errors };
}

/** Parse CSV text into import rows (supports quoted Excel CSV). */
export function parseProductImportCsv(text) {
  const matrix = [];
  const lines = String(text || '').replace(/^\uFEFF/, '').split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim()) continue;
    const cols = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        cols.push(cur);
        cur = '';
      } else {
        cur += ch;
      }
    }
    cols.push(cur);
    matrix.push(cols);
  }
  return sheetRowsToObjects(matrix);
}

/** Parse an uploaded Excel/CSV File into import rows. */
export async function parseProductImportFile(file) {
  const name = String(file?.name || '').toLowerCase();
  if (name.endsWith('.csv') || file.type === 'text/csv') {
    const text = await file.text();
    return parseProductImportCsv(text);
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) return { rows: [], errors: ['Workbook has no sheets'] };
  const matrix = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], {
    header: 1,
    defval: '',
    raw: false,
  });
  return sheetRowsToObjects(matrix);
}
