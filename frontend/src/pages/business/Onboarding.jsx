import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Stepper, Step, StepLabel, Button, Card, CardContent, TextField, Alert,
} from '@mui/material';
import api from '../../services/api';
import useBusinessCurrency from '../../hooks/useBusinessCurrency';

const steps = ['Business profile', 'Add first product', 'Open POS'];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { moneyLabel } = useBusinessCurrency();
  const [activeStep, setActiveStep] = useState(0);
  const [product, setProduct] = useState({ name: '', sale_price: '' });
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const next = async () => {
    setError('');
    if (activeStep === 1) {
      if (!product.name || !product.sale_price) {
        setError('Product name and price are required');
        return;
      }
      try {
        await api.post('/products', {
          name: product.name,
          sale_price: parseFloat(product.sale_price),
          stock_quantity: 10,
          status: 'active',
        });
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to create product');
        return;
      }
    }
    if (activeStep === steps.length - 1) {
      await api.put('/settings', { preferences: { onboarding_complete: true } }).catch(() => {});
      setDone(true);
      navigate('/pos');
      return;
    }
    setActiveStep((s) => s + 1);
  };

  return (
    <Box maxWidth={640} mx="auto" py={4}>
      <Typography variant="h4" fontWeight={700} gutterBottom>Welcome to Codex POS</Typography>
      <Typography color="text.secondary" sx={{ mb: 4 }}>Complete these steps to make your first sale.</Typography>
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
      </Stepper>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Card>
        <CardContent>
          {activeStep === 0 && (
            <Typography>Your business profile is set from registration. You can update it anytime in Settings.</Typography>
          )}
          {activeStep === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField label="Product name" value={product.name} onChange={(e) => setProduct({ ...product, name: e.target.value })} required />
              <TextField label={moneyLabel('Sale price')} type="number" value={product.sale_price} onChange={(e) => setProduct({ ...product, sale_price: e.target.value })} required />
            </Box>
          )}
          {activeStep === 2 && (
            <Typography>You're ready to open the POS and complete a test sale.</Typography>
          )}
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="contained" onClick={next}>{activeStep === steps.length - 1 ? 'Go to POS' : 'Continue'}</Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
