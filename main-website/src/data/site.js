export const APP_URL = import.meta.env.VITE_APP_URL || 'http://localhost:3000';
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api/v1';
export const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://poshive.store';

export const loginUrl = `${APP_URL}/login`;
export const registerUrl = `${APP_URL}/register`;

export const site = {
  name: 'PosHive',
  domain: 'poshive.store',
  tagline: 'POS, inventory, and storefront — one multi-tenant platform for retail ops.',
  email: 'hello@poshive.store',
};
