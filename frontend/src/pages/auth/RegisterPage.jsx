import { useForm } from 'react-hook-form';
import { useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box, Card, CardContent, TextField, Button, Typography, Alert, Container, Grid,
} from '@mui/material';
import { register as registerAction } from '../../features/auth/authSlice';

export default function RegisterPage() {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    const result = await dispatch(registerAction({
      businessName: data.businessName,
      email: data.email,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
    }));
    if (registerAction.fulfilled.match(result)) {
      localStorage.setItem('tenantSlug', result.payload.tenant?.slug);
      navigate('/dashboard');
    }
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', py: 4 }}>
        <Card sx={{ width: '100%' }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h4" align="center" gutterBottom fontWeight={700} color="primary">
              Start Your Free Trial
            </Typography>
            <form onSubmit={handleSubmit(onSubmit)}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField fullWidth label="Business Name" {...register('businessName', { required: true })} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="First Name" {...register('firstName', { required: true })} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Last Name" {...register('lastName', { required: true })} />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth label="Email" type="email" {...register('email', { required: true })} />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth label="Phone" {...register('phone')} />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth label="Password" type="password" {...register('password', { required: true, minLength: 8 })} helperText="Minimum 8 characters" />
                </Grid>
              </Grid>
              <Button fullWidth type="submit" variant="contained" size="large" sx={{ mt: 3 }}>
                Create Business Account
              </Button>
            </form>
            <Typography align="center" sx={{ mt: 2 }}>
              Already have an account? <Link to="/login">Sign in</Link>
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
}
