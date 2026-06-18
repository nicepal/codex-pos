import { useState } from 'react';
import {
  Card, CardContent, Typography, Button, Stepper, Step, StepLabel, Box,
  FormGroup, FormControlLabel, Checkbox, Stack, Alert,
} from '@mui/material';
import { CloudDownload, Sync } from '@mui/icons-material';
import ImportSummary from './ImportSummary';

const STEPS = ['Choose options', 'Run import', 'Summary'];

const DEFAULT_SETTINGS = {
  importVariants: true,
  importImages: true,
  importInventory: true,
  importCollections: true,
  createMissingCategories: true,
  updateExisting: true,
};

const OPTION_LABELS = {
  importVariants: 'Import variants & options',
  importImages: 'Import product images',
  importInventory: 'Import inventory quantities',
  importCollections: 'Import collections as categories',
  createMissingCategories: 'Create missing categories',
  updateExisting: 'Update existing matched products',
};

export default function ImportWizard({ onStart, starting, startError, activeJob, lastJob }) {
  const [activeStep, setActiveStep] = useState(0);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  // Advance to the run/summary step automatically based on job state
  const running = activeJob && ['queued', 'running'].includes(activeJob.status);
  const completed = lastJob && ['completed', 'failed'].includes(lastJob.status);

  const toggle = (key) => setSettings((s) => ({ ...s, [key]: !s[key] }));

  const handleRun = async () => {
    await onStart({ type: 'full', settings });
    setActiveStep(1);
  };

  const effectiveStep = running ? 1 : (activeStep === 2 || completed ? 2 : activeStep);

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>Import products</Typography>
        <Stepper activeStep={effectiveStep} sx={{ mb: 3 }}>
          {STEPS.map((label) => (
            <Step key={label}><StepLabel>{label}</StepLabel></Step>
          ))}
        </Stepper>

        {effectiveStep === 0 && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Select what to import from your Shopify catalog.
            </Typography>
            <FormGroup sx={{ mb: 2 }}>
              {Object.keys(OPTION_LABELS).map((key) => (
                <FormControlLabel
                  key={key}
                  control={<Checkbox checked={!!settings[key]} onChange={() => toggle(key)} />}
                  label={OPTION_LABELS[key]}
                />
              ))}
            </FormGroup>
            {startError && <Alert severity="error" sx={{ mb: 2 }}>{startError}</Alert>}
            <Button
              variant="contained"
              startIcon={<CloudDownload />}
              disabled={starting}
              onClick={handleRun}
            >
              {starting ? 'Starting…' : 'Start full import'}
            </Button>
          </Box>
        )}

        {effectiveStep === 1 && (
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              Your import is running in the background. You can leave this page — progress is saved.
            </Alert>
            <ImportSummary totals={activeJob?.totals} />
          </Box>
        )}

        {effectiveStep === 2 && (
          <Box>
            <Alert severity={lastJob?.status === 'failed' ? 'error' : 'success'} sx={{ mb: 2 }}>
              {lastJob?.status === 'failed'
                ? `Import failed: ${lastJob?.message || 'Unknown error'}`
                : (lastJob?.message || 'Import completed successfully.')}
            </Alert>
            <ImportSummary totals={lastJob?.totals} />
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <Button variant="outlined" startIcon={<CloudDownload />} onClick={() => setActiveStep(0)}>
                New import
              </Button>
            </Stack>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
