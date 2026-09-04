# PosHive Marketing Website

Standalone React + Vite marketing site for **PosHive** (`poshive.store`).

## Scripts

```bash
npm install
npm run dev      # Vite dev server (default http://localhost:5173)
npm run build
npm run preview
```

## Environment

Copy `.env.example` to `.env`:

| Variable | Purpose |
|----------|---------|
| `VITE_APP_URL` | Business app base (Login / Get Started → `/login`, `/register`) |
| `VITE_API_URL` | Optional API base for contact form |
| `VITE_SITE_URL` | Canonical site URL for SEO (`https://poshive.store`) |

## Brand assets

- `public/brand/mark.svg` — mark only
- `public/brand/wordmark.svg` — light lockup
- `public/brand/logo-dark.svg` — dark lockup
- `public/favicon.svg`, `public/og-default.svg`
- React: `<PosHiveLogo variant="light\|dark" size="sm\|md\|lg" />`

## Notes

Copy and pricing are grounded in `backend/src/database/seed.js` and shipped modules. Do not invent testimonials, stats, or marketplace claims.
