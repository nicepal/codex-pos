import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const login = createAsyncThunk('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/login', credentials);
    return data.data;
  } catch (err) {
    return rejectWithValue({
      message: err.response?.data?.message || 'Login failed',
      code: err.response?.data?.code,
    });
  }
});

export const register = createAsyncThunk('auth/register', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/register', payload);
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Registration failed');
  }
});

export const fetchMe = createAsyncThunk('auth/me', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/auth/me');
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

function syncTenantSlug(tenant) {
  if (tenant?.slug) {
    localStorage.setItem('tenantSlug', tenant.slug);
  }
}

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    tenant: null,
    accessToken: localStorage.getItem('accessToken'),
    refreshToken: localStorage.getItem('refreshToken'),
    loading: false,
    error: null,
    isAuthenticated: !!localStorage.getItem('accessToken'),
    hydrating: !!localStorage.getItem('accessToken'),
  },
  reducers: {
    logout(state) {
      state.user = null;
      state.tenant = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.hydrating = false;
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('tenantSlug');
    },
    setTokens(state, action) {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.isAuthenticated = true;
      localStorage.setItem('accessToken', action.payload.accessToken);
      localStorage.setItem('refreshToken', action.payload.refreshToken);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.tenant = action.payload.tenant;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.isAuthenticated = true;
        localStorage.setItem('accessToken', action.payload.accessToken);
        localStorage.setItem('refreshToken', action.payload.refreshToken);
        syncTenantSlug(action.payload.tenant);
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.tenant = action.payload.tenant;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.isAuthenticated = true;
        localStorage.setItem('accessToken', action.payload.accessToken);
        localStorage.setItem('refreshToken', action.payload.refreshToken);
        syncTenantSlug(action.payload.tenant);
      })
      .addCase(fetchMe.pending, (state) => {
        state.hydrating = true;
      })
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.tenant = action.payload.tenant;
        state.hydrating = false;
        syncTenantSlug(action.payload.tenant);
      })
      .addCase(fetchMe.rejected, (state) => {
        state.hydrating = false;
      });
  },
});

export const { logout, setTokens } = authSlice.actions;
export const selectAuth = (state) => state.auth;
export const selectIsPlatformAdmin = (state) =>
  state.auth.user?.roles?.some((r) => ['super_admin', 'support_agent', 'billing_manager'].includes(r));
export default authSlice.reducer;
