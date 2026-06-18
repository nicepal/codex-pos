# Codex POS API Documentation

Base URL: `http://localhost:5000/api/v1`

## Authentication

All protected endpoints require:
```
Authorization: Bearer <access_token>
```

Tenant-scoped endpoints also accept:
```
X-Tenant-Slug: demo
```
or subdomain-based resolution via `Host` header.

---

## Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register business + owner |
| POST | `/auth/login` | Login |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/logout` | Revoke refresh token |
| POST | `/auth/forgot-password` | Request password reset |
| POST | `/auth/reset-password` | Reset password |
| GET | `/auth/me` | Current user profile |

### Register
```json
{
  "businessName": "My Store",
  "email": "owner@store.com",
  "password": "SecurePass123",
  "firstName": "John",
  "lastName": "Doe"
}
```

---

## Platform Admin

| Method | Endpoint | Permission |
|--------|----------|------------|
| GET | `/businesses/dashboard` | Platform admin |
| GET | `/businesses/charts` | Platform admin |
| GET | `/businesses` | Platform admin |
| GET | `/businesses/:id` | Platform admin |
| PUT | `/businesses/:id` | Platform admin |
| POST | `/businesses/:id/suspend` | Platform admin |
| POST | `/businesses/:id/activate` | Platform admin |
| POST | `/businesses/:id/extend-trial` | Platform admin |
| DELETE | `/businesses/:id` | Platform admin |

---

## Plans & Subscriptions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/plans` | List plans (public) |
| POST | `/plans` | Create plan (admin) |
| GET | `/subscriptions/current` | Current tenant subscription |
| POST | `/subscriptions/upgrade` | Upgrade plan |

---

## Products

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/products` | List products |
| GET | `/products/search?q=` | Search (POS) |
| GET | `/products/:id` | Get product |
| POST | `/products` | Create product |
| PUT | `/products/:id` | Update product |
| DELETE | `/products/:id` | Delete product |

---

## Orders / POS

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/orders` | List orders |
| POST | `/orders` | Create POS order |
| POST | `/orders/hold` | Hold sale |
| POST | `/orders/:id/resume` | Resume held sale |
| PATCH | `/orders/:id/status` | Update status |

### Create Order
```json
{
  "items": [
    { "product_id": "uuid", "product_name": "Item", "quantity": 2, "unit_price": 9.99 }
  ],
  "payment_method": "cash",
  "discount_amount": 0,
  "status": "paid"
}
```

---

## Inventory

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/inventory` | Transaction history |
| GET | `/inventory/low-stock` | Low stock alerts |
| POST | `/inventory/stock-in` | Stock in |
| POST | `/inventory/stock-out` | Stock out |
| POST | `/inventory/adjustment` | Adjustment |

---

## Reports

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/reports/dashboard` | Business dashboard stats |
| GET | `/reports/sales?period=daily` | Sales report |
| GET | `/reports/top-products` | Top selling products |
| GET | `/reports/inventory` | Inventory report |
| GET | `/reports/financial` | P&L report |

---

## Storefront (Public)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/storefront` | Store info |
| GET | `/storefront/products` | Product listing |
| GET | `/storefront/products/:slug` | Product detail |
| GET | `/storefront/categories` | Categories |

---

## CRUD Resources

Standard REST for: `/categories`, `/customers`, `/suppliers`, `/employees`, `/expenses`

| Method | Pattern |
|--------|---------|
| GET | `/:resource` |
| GET | `/:resource/:id` |
| POST | `/:resource` |
| PUT | `/:resource/:id` |
| DELETE | `/:resource/:id` |

---

## Response Format

```json
{
  "success": true,
  "message": "Success",
  "data": {},
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## Error Format

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Validation failed",
  "details": [{ "field": "email", "message": "..." }]
}
```
