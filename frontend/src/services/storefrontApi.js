import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

const STORE_TOKEN_KEY = 'storefrontToken';

export function getStoreToken() {
  return localStorage.getItem(STORE_TOKEN_KEY);
}
export function setStoreToken(token) {
  if (token) localStorage.setItem(STORE_TOKEN_KEY, token);
}
export function clearStoreToken() {
  localStorage.removeItem(STORE_TOKEN_KEY);
}

// Dedicated client for storefront customer requests so it doesn't collide with
// the business user's accessToken used by the main `api` instance.
const storefrontApi = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

storefrontApi.interceptors.request.use((config) => {
  const token = getStoreToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;

  if (typeof window !== 'undefined') {
    const match = window.location.pathname.match(/^\/store\/([^/]+)/);
    if (match?.[1]) config.headers['X-Tenant-Slug'] = match[1];
  }
  return config;
});

export default storefrontApi;
