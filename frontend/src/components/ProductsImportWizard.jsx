import { useState, useMemo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, TextField,
  Stepper, Step, StepLabel, Alert, Box, Table, TableHead, TableRow, TableCell, TableBody,
  MenuItem, Stack,
} from '@mui/material';
import { UploadFile, Download, TableChart } from '@mui/icons-material';
import api from '../services/api';
import {
  downloadProductImportSampleExcel,
  parseProductImportCsv,
  parseProductImportFile,
  PRODUCT_IMPORT_COLUMNS,
} from '../utils/productImport';

export default function ProductsImportWizard({ open, onClose, onSuccess }) {
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState('create');
  const [csvText, setCsvText] = useState('');
  const [fileRows, setFileRows] = useState(null);
  const [fileErrors, setFileErrors] = useState([]);
  const [fileName, setFileName] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const pasted = useMemo(() => parseProductImportCsv(csvText), [csvText]);
  const rows = fileRows?.length ? fileRows : pasted.rows;
  const parseErrors = fileRows?.length ? fileErrors : pasted.errors;

  const reset = () => {
    setStep(0);
    setMode('create');
    setCsvText('');
    setFileRows(null);
    setFileErrors([]);
    setFileName('');
    setResult(null);
    setError('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFile = async (file) => {
    if (!file) return;
    setError('');
    setFileName(file.name);
    try {
      const parsed = await parseProductImportFile(file);
      setFileRows(parsed.rows);
      setFileErrors(parsed.errors || []);
      setCsvText('');
    } catch (err) {
      setFileRows(null);
      setFileErrors([]);
      setError(err.message || 'Could not read file');
    }
  };

  const runImport = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/products/import', { rows, mode });
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
      <DialogTitle>Bulk Import Products</DialogTitle>
      <DialogContent>
        <Stepper activeStep={step} sx={{ mb: 3 }}>
          <Step><StepLabel>Setup</StepLabel></Step>
          <Step><StepLabel>Upload file</StepLabel></Step>
          <Step><StepLabel>Results</StepLabel></Step>
        </Stepper>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {step === 0 && (
          <Stack spacing={2}>
            <Typography color="text.secondary">
              Download the sample Excel file, fill in your products, then upload it.
              Supported columns: {PRODUCT_IMPORT_COLUMNS.join(', ')}.
            </Typography>
            <Alert severity="info" icon={<TableChart />}>
              Required for new products: <strong>name</strong> and <strong>sale_price</strong>.
              For updates, include <strong>sku</strong> and choose “Update existing by SKU”.
            </Alert>
            <Button
              variant="contained"
              startIcon={<Download />}
              onClick={downloadProductImportSampleExcel}
              sx={{ alignSelf: 'flex-start' }}
            >
              Download sample Excel
            </Button>
            <TextField select label="Import mode" value={mode} onChange={(e) => setMode(e.target.value)}>
              <MenuItem value="create">Create new products only</MenuItem>
              <MenuItem value="update">Update existing by SKU</MenuItem>
            </TextField>
          </Stack>
        )}

        {step === 1 && (
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Button
                variant="outlined"
                startIcon={<Download />}
                onClick={downloadProductImportSampleExcel}
              >
                Download sample Excel
              </Button>
              <Button variant="outlined" component="label" startIcon={<UploadFile />}>
                Upload Excel / CSV
                <input
                  type="file"
                  hidden
                  accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    handleFile(file);
                    e.target.value = '';
                  }}
                />
              </Button>
            </Stack>
            {fileName && (
              <Typography variant="body2" color="text.secondary">
                Selected file: {fileName}
              </Typography>
            )}
            <TextField
              fullWidth
              multiline
              rows={8}
              label="Or paste CSV"
              value={csvText}
              onChange={(e) => {
                setCsvText(e.target.value);
                setFileRows(null);
                setFileErrors([]);
                setFileName('');
              }}
              placeholder="name,sku,barcode,sale_price,cost_price,stock_quantity,status"
            />
            {parseErrors.length > 0 && (
              <Alert severity="warning">
                {parseErrors.map((e) => <div key={e}>{e}</div>)}
              </Alert>
            )}
            {rows.length > 0 && (
              <Typography variant="body2">{rows.length} row(s) ready to import</Typography>
            )}
            {rows.length > 0 && (
              <Box sx={{ maxHeight: 220, overflow: 'auto' }}>
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
                    {rows.slice(0, 8).map((r, i) => (
                      <TableRow key={`${r.sku || r.name}-${i}`}>
                        <TableCell>{r.name}</TableCell>
                        <TableCell>{r.sku}</TableCell>
                        <TableCell>{r.sale_price}</TableCell>
                        <TableCell>{r.stock_quantity}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {rows.length > 8 && (
                  <Typography variant="caption" color="text.secondary">
                    …and {rows.length - 8} more
                  </Typography>
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
            <Button variant="contained" disabled={!rows.length || loading} onClick={runImport}>
              {loading ? 'Importing…' : `Import ${rows.length} row(s)`}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
