import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Alert, Box,
} from '@mui/material';
import { UploadFile } from '@mui/icons-material';
import api from '../../../../services/api';

const TEMPLATE = 'title,amount,category,expense_date,supplier_name,payment_method,status,notes\nOffice supplies,150.00,Supplies,2026-01-15,Staples,card,paid,Monthly order';

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return { rows: [], errors: ['CSV must include header and at least one row'] };
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const rows = [];
  const errors = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cols = lines[i].split(',').map((c) => c.trim());
    const row = {};
    headers.forEach((h, idx) => { if (cols[idx]) row[h] = cols[idx]; });
    if (!row.title || !row.amount) {
      errors.push(`Row ${i + 1}: title and amount required`);
      continue;
    }
    rows.push(row);
  }
  return { rows, errors };
}

export default function ExpenseImportDialog({ open, onClose, onSuccess }) {
  const [csvText, setCsvText] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const parsed = parseCsv(csvText);

  const handleClose = () => {
    setCsvText('');
    setError('');
    setResult(null);
    onClose();
  };

  const runImport = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/expenses/import', { rows: parsed.rows });
      setResult(res.data.data);
      onSuccess?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Import Expenses</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {result ? (
          <Alert severity="success">Imported {result.imported} expense(s).{result.errors?.length ? ` ${result.errors.length} row(s) failed.` : ''}</Alert>
        ) : (
          <>
            <Button variant="outlined" component="label" startIcon={<UploadFile />} sx={{ mb: 2 }}>
              Upload CSV
              <input type="file" hidden accept=".csv" onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => setCsvText(String(reader.result || ''));
                reader.readAsText(file);
              }} />
            </Button>
            <Button size="small" onClick={() => setCsvText(TEMPLATE)} sx={{ ml: 1, mb: 2 }}>Load template</Button>
            <TextField fullWidth multiline rows={10} value={csvText} onChange={(e) => setCsvText(e.target.value)} placeholder={TEMPLATE} />
            {parsed.errors.length > 0 && <Alert severity="warning" sx={{ mt: 1 }}>{parsed.errors.join('; ')}</Alert>}
            {parsed.rows.length > 0 && <Box sx={{ mt: 1 }}>{parsed.rows.length} row(s) ready</Box>}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{result ? 'Close' : 'Cancel'}</Button>
        {!result && (
          <Button variant="contained" disabled={!parsed.rows.length || loading} onClick={runImport}>
            {loading ? 'Importing…' : 'Import'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
