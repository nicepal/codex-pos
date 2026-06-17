import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import {
  Box, Typography, Card, CardContent, Grid, TextField, Button, MenuItem, Divider, Alert,
  FormControlLabel, Switch, Stack,
} from '@mui/material';
import { OpenInNew } from '@mui/icons-material';
import api from '../../services/api';
import ImageUpload, { LogoPreview } from '../../components/ImageUpload';
import ColorPickerField from '../../components/ColorPickerField';
import StorefrontThemePreview from '../../components/storefront/StorefrontThemePreview';
import LoadingState from '../../components/LoadingState';
import RHFTextField from '../../components/RHFTextField';
import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { fetchMe, setTenantProfile } from '../../features/auth/authSlice';
import { CURRENCY_OPTIONS } from '../../utils/currency';
import useTenantFeatures from '../../hooks/useTenantFeatures';
import TaxRulesSection from './settings/TaxRulesSection';
import WebhooksSection from './settings/WebhooksSection';
import DomainsSection from './settings/DomainsSection';

function MfaSection() {
  const [secret, setSecret] = useState('');
  const [token, setToken] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [disableToken, setDisableToken] = useState('');
  const [message, setMessage] = useState('');
  const setup = () => api.post('/auth/mfa/setup').then((r) => setSecret(r.data.data.secret));
  const enable = () => api.post('/auth/mfa/enable', { token }).then(() => setMessage('MFA enabled'));
  const disable = () => api.post('/auth/mfa/disable', { password: disablePassword, token: disableToken })
    .then(() => {
      setMessage('MFA disabled');
      setDisablePassword('');
      setDisableToken('');
    })
    .catch((err) => setMessage(err.response?.data?.message || 'Failed to disable MFA'));
  return (
    <>
      {message && <Alert severity="info" sx={{ mb: 1 }}>{message}</Alert>}
      <Button variant="outlined" fullWidth onClick={setup}>Setup MFA</Button>
      {secret && <Typography variant="caption" sx={{ display: 'block', mt: 1, wordBreak: 'break-all' }}>Secret: {secret}</Typography>}
      <TextField fullWidth label="Authenticator Code" value={token} onChange={(e) => setToken(e.target.value)} sx={{ mt: 1 }} />
      <Button variant="contained" fullWidth sx={{ mt: 1 }} onClick={enable} disabled={!token}>Enable MFA</Button>
      <Divider sx={{ my: 2 }} />
      <Typography variant="subtitle2" gutterBottom>Disable MFA</Typography>
      <TextField fullWidth label="Password" type="password" value={disablePassword} onChange={(e) => setDisablePassword(e.target.value)} sx={{ mb: 1 }} />
      <TextField fullWidth label="Authenticator Code" value={disableToken} onChange={(e) => setDisableToken(e.target.value)} sx={{ mb: 1 }} />
      <Button variant="outlined" color="warning" fullWidth onClick={disable} disabled={!disablePassword || !disableToken}>
        Disable MFA
      </Button>
    </>
  );
}

function FeaturesSection({ features, planFeatures, packs, onChange }) {
  const entries = Object.entries(packs || {});
  if (!entries.length) return null;

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>Feature Packs</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Enable optional capabilities for your business. Some packs require a higher subscription plan.
        </Typography>
        <Stack spacing={1}>
          {entries.map(([key, meta]) => {
            const planAllows = planFeatures?.[key] !== false && Boolean(planFeatures?.[key]);
            const blockedByPlan = !planAllows;
            return (
              <FormControlLabel
                key={key}
                control={(
                  <Switch
                    checked={!!features?.[key]}
                    disabled={blockedByPlan}
                    onChange={(e) => onChange(key, e.target.checked)}
                  />
                )}
                label={(
                  <Box>
                    <Typography variant="body2" fontWeight={600}>{meta.label || key}</Typography>
                    {meta.description && (
                      <Typography variant="caption" color="text.secondary" display="block">{meta.description}</Typography>
                    )}
                    {blockedByPlan && (
                      <Typography variant="caption" color="warning.main" display="block">
                        Not included in your current plan — upgrade to enable
                      </Typography>
                    )}
                  </Box>
                )}
                sx={{ alignItems: 'flex-start', ml: 0 }}
              />
            );
          })}
        </Stack>
      </CardContent>
    </Card>
  );
}

const timezones = ['UTC', 'America/New_York', 'America/Chicago', 'America/Los_Angeles', 'Europe/London', 'Asia/Karachi', 'Asia/Dubai'];

const DEFAULT_THEME = {
  primary_color: '#2563eb',
  announcement_color: '#2563eb',
  background_color: '#f4f6f9',
  banner_text: '',
  announcement_text: 'Order online · Inventory synced with our POS · Pickup & delivery available',
  footer_text: '',
  tagline: '',
  show_announcement: true,
  show_stock: true,
  storefront_enabled: true,
};

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const [featureFlags, setFeatureFlags] = useState({});
  const [planFeatures, setPlanFeatures] = useState({});
  const [cappedFeatures, setCappedFeatures] = useState([]);
  const { hasFeature } = useTenantFeatures();

  const { data, isLoading } = useQuery({
    queryKey: ['business-settings'],
    queryFn: () => api.get('/settings').then((r) => r.data.data),
  });

  const { register, handleSubmit, setValue, watch, reset, control } = useForm({
    defaultValues: {
      currency: 'USD',
      timezone: 'UTC',
      ...DEFAULT_THEME,
    },
  });

  useEffect(() => {
    if (!data) return;
    const theme = { ...DEFAULT_THEME, ...data.storefront_theme };
    const prefs = data.preferences || {};
    reset({
      name: data.profile?.name ?? '',
      email: data.profile?.email ?? '',
      phone: data.profile?.phone ?? '',
      address: data.profile?.address ?? '',
      city: data.profile?.city ?? '',
      state: data.profile?.state ?? '',
      country: data.profile?.country ?? '',
      postal_code: data.profile?.postal_code ?? '',
      timezone: data.profile?.timezone || 'UTC',
      currency: data.profile?.currency || 'USD',
      logo_url: data.profile?.logo_url ?? '',
      tax_rate: prefs.tax_rate ?? '',
      receipt_footer: prefs.receipt_footer ?? '',
      low_stock_alert: prefs.low_stock_alert ?? true,
      pos_quick_keys: JSON.stringify(prefs.pos_quick_keys || [], null, 2),
      loyalty_points_per_dollar: prefs.loyalty?.points_per_dollar ?? 1,
      loyalty_redeem_rate: prefs.loyalty?.redeem_rate ?? 0.01,
      ...theme,
    });
    setFeatureFlags(data.features || {});
    setPlanFeatures(data.plan_features || {});
    setCappedFeatures([]);
  }, [data, reset]);

  const mutation = useMutation({
    mutationFn: (payload) => api.put('/settings', payload),
    onSuccess: (res) => {
      const saved = res.data.data;
      if (saved?.features) setFeatureFlags(saved.features);
      if (saved?.plan_features) setPlanFeatures(saved.plan_features);
      setCappedFeatures(saved?.features_capped || []);
      queryClient.invalidateQueries(['business-settings']);
      queryClient.invalidateQueries({ queryKey: ['storefront-theme'] });
      if (variables?.profile?.currency) {
        dispatch(setTenantProfile({ currency: variables.profile.currency }));
      }
      dispatch(fetchMe());
    },
  });

  const logoUrl = watch('logo_url');
  const storeName = watch('name');
  const primaryColor = watch('primary_color');
  const announcementColor = watch('announcement_color');
  const backgroundColor = watch('background_color');
  const storefrontEnabled = watch('storefront_enabled');

  const onSubmit = (form) => {
    mutation.mutate({
      profile: {
        name: form.name,
        email: form.email,
        phone: form.phone,
        address: form.address,
        city: form.city,
        state: form.state,
        country: form.country,
        postal_code: form.postal_code,
        timezone: form.timezone,
        currency: form.currency,
        logo_url: form.logo_url,
      },
      preferences: {
        tax_rate: parseFloat(form.tax_rate) || 0,
        receipt_footer: form.receipt_footer,
        low_stock_alert: form.low_stock_alert,
        pos_quick_keys: form.pos_quick_keys ? JSON.parse(form.pos_quick_keys) : [],
        loyalty: {
          points_per_dollar: parseFloat(form.loyalty_points_per_dollar) || 1,
          redeem_rate: parseFloat(form.loyalty_redeem_rate) || 0.01,
        },
      },
      storefront_theme: {
        primary_color: form.primary_color || DEFAULT_THEME.primary_color,
        announcement_color: form.announcement_color || form.primary_color || DEFAULT_THEME.primary_color,
        background_color: form.background_color || DEFAULT_THEME.background_color,
        banner_text: form.banner_text || '',
        announcement_text: form.announcement_text || DEFAULT_THEME.announcement_text,
        footer_text: form.footer_text || '',
        tagline: form.tagline || '',
        show_announcement: !!form.show_announcement,
        show_stock: !!form.show_stock,
        storefront_enabled: !!form.storefront_enabled,
      },
      features: featureFlags,
    });
  };

  const storeSlug = data?.profile?.slug;
  const storefrontUrl = storeSlug ? `/store/${storeSlug}` : null;

  if (isLoading) return <LoadingState />;

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>Business Settings</Typography>
      {mutation.isSuccess && <Alert severity="success" sx={{ mb: 2 }}>Settings saved successfully</Alert>}
      {cappedFeatures.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Some feature packs were not saved because they are not included in your subscription plan: {cappedFeatures.join(', ')}.
        </Alert>
      )}

      <form key={data?.profile?.slug || 'settings'} onSubmit={handleSubmit(onSubmit)}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Business Profile</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}><RHFTextField register={register} name="name" rules={{ required: true }} label="Business Name" /></Grid>
                  <Grid item xs={12} sm={6}><TextField fullWidth label="Email" type="email" {...register('email')} /></Grid>
                  <Grid item xs={12} sm={6}><TextField fullWidth label="Phone" {...register('phone')} /></Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="currency"
                      control={control}
                      render={({ field }) => (
                        <TextField fullWidth select label="Currency" {...field}>
                          {CURRENCY_OPTIONS.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                        </TextField>
                      )}
                    />
                  </Grid>
                  <Grid item xs={12}><TextField fullWidth label="Address" {...register('address')} /></Grid>
                  <Grid item xs={12} sm={4}><TextField fullWidth label="City" {...register('city')} /></Grid>
                  <Grid item xs={12} sm={4}><TextField fullWidth label="State" {...register('state')} /></Grid>
                  <Grid item xs={12} sm={4}><TextField fullWidth label="Postal Code" {...register('postal_code')} /></Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="timezone"
                      control={control}
                      render={({ field }) => (
                        <TextField fullWidth select label="Timezone" {...field}>
                          {timezones.map((tz) => <MenuItem key={tz} value={tz}>{tz}</MenuItem>)}
                        </TextField>
                      )}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>POS & Receipt Preferences</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="Default Tax Rate (%)" type="number" inputProps={{ step: 0.01 }} {...register('tax_rate')} />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField fullWidth label="Receipt Footer Text" multiline rows={2} {...register('receipt_footer')} placeholder="Thank you for your purchase!" />
                  </Grid>
                  {featureFlags.pos_pro && (
                    <Grid item xs={12}>
                      <TextField fullWidth label="POS Quick Keys (JSON)" multiline rows={4}
                        helperText='[{"product_id":"uuid","name":"Coffee"}]'
                        {...register('pos_quick_keys')} />
                    </Grid>
                  )}
                  {featureFlags.crm_pro && (
                    <>
                      <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Loyalty points per dollar" type="number"
                          inputProps={{ step: 0.1, min: 0 }} {...register('loyalty_points_per_dollar')} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Redeem rate ($ per point)" type="number"
                          inputProps={{ step: 0.01, min: 0 }} {...register('loyalty_redeem_rate')} />
                      </Grid>
                    </>
                  )}
                </Grid>
              </CardContent>
            </Card>

            <FeaturesSection
              features={featureFlags}
              planFeatures={planFeatures}
              packs={data?.feature_packs}
              onChange={(key, val) => setFeatureFlags((prev) => ({ ...prev, [key]: val }))}
            />

            <TaxRulesSection enabled={hasFeature('tax_advanced')} />
            <WebhooksSection enabled={hasFeature('omnichannel')} />
            <DomainsSection enabled={hasFeature('omnichannel')} storeSlug={storeSlug} />

            <Card>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="h6">Online Shop</Typography>
                  {storefrontUrl && (
                    <Button
                      size="small"
                      href={storefrontUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      endIcon={<OpenInNew fontSize="small" />}
                    >
                      Preview shop
                    </Button>
                  )}
                </Stack>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Controller
                      name="storefront_enabled"
                      control={control}
                      render={({ field }) => (
                        <FormControlLabel
                          control={<Switch checked={!!field.value} onChange={(e) => field.onChange(e.target.checked)} />}
                          label="Enable online shop"
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Home page welcome text"
                      multiline
                      rows={2}
                      {...register('banner_text')}
                      placeholder="Order online — inventory and pricing synced with our store in real time."
                      disabled={!storefrontEnabled}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Store tagline"
                      {...register('tagline')}
                      placeholder="Short line shown under your store name"
                      disabled={!storefrontEnabled}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Top announcement bar"
                      {...register('announcement_text')}
                      placeholder="Order online · Pickup & delivery available"
                      disabled={!storefrontEnabled}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Footer text"
                      multiline
                      rows={2}
                      {...register('footer_text')}
                      placeholder="Powered by EYZ POS"
                      disabled={!storefrontEnabled}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="show_announcement"
                      control={control}
                      render={({ field }) => (
                        <FormControlLabel
                          control={<Switch checked={!!field.value} onChange={(e) => field.onChange(e.target.checked)} disabled={!storefrontEnabled} />}
                          label="Show announcement bar"
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="show_stock"
                      control={control}
                      render={({ field }) => (
                        <FormControlLabel
                          control={<Switch checked={!!field.value} onChange={(e) => field.onChange(e.target.checked)} disabled={!storefrontEnabled} />}
                          label="Show stock levels on products"
                        />
                      )}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Logo</Typography>
                <LogoPreview url={logoUrl} name={storeName} />
                <ImageUpload
                  label="Upload Logo"
                  endpoint="/upload/logo"
                  onUploaded={(file) => setValue('logo_url', file.url)}
                />
                <Divider sx={{ my: 2 }} />
                <Typography variant="body2" color="text.secondary" gutterBottom>Store URL</Typography>
                <Typography variant="body1" fontWeight={600}>{storeSlug}.eyz.com</Typography>
              </CardContent>
            </Card>

            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Shop Colors</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Customize your storefront appearance. Changes apply after saving.
                </Typography>

                <Stack spacing={2} sx={{ mb: 2 }}>
                  <Controller
                    name="primary_color"
                    control={control}
                    render={({ field }) => (
                      <ColorPickerField
                        label="Primary color"
                        value={field.value}
                        onChange={field.onChange}
                        helperText="Buttons, links, and accents"
                      />
                    )}
                  />
                  <Controller
                    name="announcement_color"
                    control={control}
                    render={({ field }) => (
                      <ColorPickerField
                        label="Announcement bar color"
                        value={field.value}
                        onChange={field.onChange}
                        helperText="Top bar background"
                        fallback={primaryColor || DEFAULT_THEME.primary_color}
                      />
                    )}
                  />
                  <Controller
                    name="background_color"
                    control={control}
                    render={({ field }) => (
                      <ColorPickerField
                        label="Page background"
                        value={field.value}
                        onChange={field.onChange}
                        helperText="Main shop background"
                        fallback={DEFAULT_THEME.background_color}
                      />
                    )}
                  />
                </Stack>

                <Typography variant="subtitle2" fontWeight={600} gutterBottom>Preview</Typography>
                <StorefrontThemePreview
                  primaryColor={primaryColor || DEFAULT_THEME.primary_color}
                  announcementColor={announcementColor || primaryColor}
                  backgroundColor={backgroundColor || DEFAULT_THEME.background_color}
                  storeName={storeName || 'Your Store'}
                />
              </CardContent>
            </Card>

            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Security (MFA)</Typography>
                <MfaSection />
              </CardContent>
            </Card>

            <Button type="submit" variant="contained" fullWidth size="large" sx={{ mt: 2 }} disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : 'Save Settings'}
            </Button>
          </Grid>
        </Grid>
      </form>
    </Box>
  );
}
