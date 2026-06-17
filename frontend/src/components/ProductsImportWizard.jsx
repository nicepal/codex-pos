import { useState, useMemo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, TextField,
  Stepper, Step, StepLabel, Alert, Box, Table, TableHead, TableRow, TableCell, TableBody,
  MenuItem, Stack,
} from '@mui/material';
import { UploadFile } from '@mui/icons-material';
import api from '../services/api';

const TEMPLATE = 'name,sku,barcode,sale_price,cost_price,stock_quantity,status\nExample Product,SKU-001,,9.99,5.00,100,active';

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return { rows: [], errors: ['CSV must include a header row and at least one data row'] };

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const rows = [];
  const errors = [];

  for (let i = 1; i < lines.length; i += 1) {
    const cols = lines[i].split(',').map((c) => c.trim());
    const row = {};
    headers.forEach((h, idx) => {
      if (cols[idx] !== undefined && cols[idx] !== '') row[h] = cols[idx];
    });
    if (!row.name && !row.sku) {
      errors.push(`Row ${i + 1}: name or sku required`);
      continue;
    }
    rows.push(row);
  }
  return { rows, errors };
}

export default function ProductsImportWizard({ open, onClose, onSuccess }) {
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState('create');
  const [csvText, setCsvText] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const parsed = useMemo(() => parseCsv(csvText), [csvText]);

  const reset = () => {
    setStep(0);
    setMode('create');
    setCsvText('');
    setResult(null);
    setError('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const runImport = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/products/import', { rows: parsed.rows, mode });
      setResult(res.data.data);
      setStep(2);
      onSuccess?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Import Products</DialogTitle>
      <DialogContent>
        <Stepper activeStep={step} sx={{ mb: 3 }}>
          <Step><StepLabel>Mode</StepLabel></Step>
          <Step><StepLabel>Upload CSV</StepLabel></Step>
          <Step><StepLabel>Results</StepLabel></Step>
        </Stepper>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {step === 0 && (
          <Stack spacing={2}>
            <Typography color="text.secondary">
              Import new products or update existing ones by SKU. Requires Catalog Pro.
            </Typography>
            <TextField select label="Import mode" value={mode} onChange={(e) => setMode(e.target.value)}>
              <MenuItem value="create">Create new products only</MenuItem>
              <MenuItem value="update">Update existing by SKU</MenuItem>
            </TextField>
            <Button variant="outlined" onClick={() => setCsvText(TEMPLATE)}>Load template</Button>
          </Stack>
        )}

        {step === 1 && (
          <Stack spacing={2}>
            <Button variant="outlined" component="label" startIcon={<UploadFile />}>
              Upload CSV file
              <input type="file" hidden accept=".csv,text/csv" onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => setCsvText(String(reader.result || ''));
                reader.readAsText(file);
                e.target.value = '';
              }} />
            </Button>
            <TextField fullWidth multiline rows={10} label="Or paste CSV" value={csvText}
              onChange={(e) => setCsvText(e.target.value)} placeholder={TEMPLATE} />
            {parsed.errors.length > 0 && (
              <Alert severity="warning">
                {parsed.errors.map((e) => <div key={e}>{e}</div>)}
              </Alert>
            )}
            {parsed.rows.length > 0 && (
              <Typography variant="body2">{parsed.rows.length} row(s) ready to import</Typography>
            )}
            {parsed.rows.length > 0 && (
              <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>SKU</TableCell>
                      <TableCell>Price</TableCell>
                      <TableCell>Stock</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {parsed.rows.slice(0, 5).map((r, i) => (
                      <TableRow key={i}>
                        <TableCell>{r.name}</TableCell>
                        <TableCell>{r.sku}</TableCell>
                        <TableCell>{r.sale_price}</TableCell>
                        <TableCell>{r.stock_quantity}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {parsed.rows.length > 5 && (
                  <Typography variant="caption" color="text.secondary">…and {parsed.rows.length - 5} more</Typography>
                )}
              </Box>
            )}
          </Stack>
        )}

        {step === 2 && result && (
          <Stack spacing={2}>
            <Alert severity="success">
              Imported {result.imported} product(s), updated {result.updated || 0}.
            </Alert>
            {result.errors?.length > 0 && (
              <Alert severity="warning">
                {result.errors.length} row(s) had errors:
                <Box component="ul" sx={{ mb: 0, pl: 2 }}>
                  {result.errors.slice(0, 10).map((e) => (
                    <li key={`${e.row}-${e.message}`}>Row {e.row}: {e.message}</li>
                  ))}
                </Box>
              </Alert>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{step === 2 ? 'Close' : 'Cancel'}</Button>
        {step === 0 && (
          <Button variant="contained" onClick={() => setStep(1)}>Next</Button>
        )}
        {step === 1 && (
          <>
            <Button onClick={() => setStep(0)}>Back</Button>
            <Button variant="contained" disabled={!parsed.rows.length || loading} onClick={runImport}>
              {loading ? 'Importing…' : `Import ${parsed.rows.length} row(s)`}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
