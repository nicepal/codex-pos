# PosHive Restaurant + KDS

Date: 2026-08-12

## Overview

Restaurant Pro extends PosHive with table/floor management, dining sessions, restaurant POS mode, product modifiers, and a live kitchen display (KDS).

Feature pack: **`restaurant_pro`** (enable in Settings → Feature packs; included on Enterprise plan defaults).

Permissions (RBAC):

| Permission | Purpose |
|------------|---------|
| `restaurant.view` | Dashboard, read-only access |
| `restaurant.manage` | Full restaurant module |
| `restaurant.tables.view` | View floors/tables/sessions |
| `restaurant.tables.manage` | CRUD floors/tables, open/close sessions |
| `restaurant.settings.manage` | Update `settings.restaurant` JSON |

## Architecture

```mermaid
flowchart TB
  subgraph POS
    POSPage[POS.jsx]
    TablePicker[TablePickerDialog]
    ModPicker[ModifierPickerDialog]
    KitchenUI[SendToKitchenDialog]
    KDS[/kds]
  end
  subgraph Admin UI
    RD[RestaurantDashboard]
    RT[RestaurantTables]
    RS[RestaurantSettings]
  end
  subgraph API
    RR[/restaurant/*]
    MR[/modifiers/*]
    ORD[/orders hold + kitchen/send]
    KDSAPI[/restaurant/kds/*]
  end
  subgraph Data
    RF[restaurant_floors]
    RTb[restaurant_tables]
    RTS[restaurant_table_sessions]
    KT[kitchen_tickets]
    MG[modifier_groups]
    MO[modifier_options]
    PMG[product_modifier_groups]
    ST[settings key restaurant]
    ORDtbl[orders dining columns]
  end
  POSPage --> TablePicker --> RR
  POSPage --> ModPicker --> MR
  POSPage --> KitchenUI --> ORD
  KitchenUI --> KT
  KDS --> KDSAPI --> KT
  RD --> RR
  RT --> RR
  RS --> RR
  RR --> RF
  RR --> RTb
  RR --> RTS
  MR --> MG
  MR --> MO
  MR --> PMG
  ORD --> ORDtbl
  ORDtbl -.-> RTS
  ORDtbl -.-> RTb
```

Retail `/pos` is unchanged when `restaurant_pro` is disabled. When enabled, cashiers can switch **Retail / Restaurant** mode (preference stored in `localStorage` key `posMode`).

---

## Phase 1 — COMPLETE

### Database (`019_restaurant_foundation.sql`)

- `restaurant_floors`, `restaurant_tables`, `restaurant_table_sessions`
- `orders` extensions: `dining_session_id`, `table_id`, `guest_count`, `server_employee_id`, `kitchen_status`
- Settings key `restaurant` (JSON)
- Permissions seeded for `business_owner` and `manager`

### Backend module `backend/src/modules/restaurant/`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/restaurant/settings` | GET, PUT | Read/update restaurant preferences |
| `/restaurant/dashboard` | GET | Counts: sessions, guests, table statuses |
| `/restaurant/floors` | GET, POST | List/create floors |
| `/restaurant/floors/:id` | PUT, DELETE | Update/delete floor |
| `/restaurant/tables` | GET, POST | List/create tables |
| `/restaurant/tables/:id` | PUT, DELETE | Update/delete table |
| `/restaurant/tables/:id/open` | POST | Open dining session |
| `/restaurant/tables/:id/close` | POST | Close session |
| `/restaurant/tables/:id/session` | GET | Active session for table |

### Frontend (admin)

| Route | Page |
|-------|------|
| `/restaurant` | Dashboard + stats |
| `/restaurant/tables` | Floor plan grid, open/close sessions |
| `/restaurant/settings` | Preferences + floor CRUD |

---

## Phase 2 — COMPLETE

### Restaurant POS mode (`/pos`)

When `restaurant_pro` is enabled:

1. **Mode selector** — Retail / Restaurant toggle in POS header (preference persisted, not forced).
2. **Restaurant context bar** — Dine-in / Takeaway; table chip, guest count, server.
3. **Dine-in flow** — Floor → table → guest count → optional server → products → cart.
4. **Occupied table** — Shows session/order summary; **Open order** loads pending/on_hold order into cart via `GET /restaurant/tables/:id/active-order`.
5. **Takeaway** — No table/session required; `dining_order_type: takeaway` on order.
6. **Send to kitchen** — **LIVE.** Confirmation dialog; hold/append order then `POST /restaurant/orders/:id/kitchen/send` creates real kitchen tickets for KDS. Do not mock.
7. **Offline** — Dine-in table sync blocked with warning. No fake session sync.

### Cart / orders integration

`cartSlice` restaurant metadata: `posMode`, `orderType`, `tableId`, `diningSessionId`, `guestCount`, `serverEmployeeId`, `existingOrderId`, `kitchenSent`.

`POST /orders` accepts `dining_order_type`, `dining_session_id`, `table_id`, `guest_count`, `server_employee_id`, `send_to_kitchen`, and per-item `selected_modifiers[]`, `item_notes`.

### Modifiers foundation (`020_restaurant_modifiers.sql`)

- `modifier_groups`, `modifier_options`, `product_modifier_groups`
- API under `/modifiers/*`
- Snapshots stored in `order_items.metadata.modifiers`

### New endpoint

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/restaurant/tables/:id/active-order` | GET | Active session + latest pending/on_hold order |

### Tests

- `restaurant-pos-phase2.test.js` — modifier validation/pricing (500 + 200 + 100 × 2 = 1600)

---

## Phase 3 — COMPLETE (Kitchen tickets + KDS)

- Migrations `022_kitchen_kds.sql`, `023_kitchen_order_item_status.sql`
- Send-to-kitchen: `POST /restaurant/orders/:id/kitchen/send`
- KDS UI: `/kds` (full-screen), polls `/restaurant/kds/tickets` + Socket.IO `kitchen.ticket.*`
- Ticket actions: accept / start / ready / complete / recall

## Planned phases

### Phase 4 — Split / transfer / merge

### Phase 5 — Reservations & waitlist

---

## Settings JSON schema

```json
{
  "default_guest_count": 2,
  "show_capacity_on_floor_plan": true,
  "post_close_table_status": "available",
  "enable_reservations": false,
  "default_floor_id": "uuid-or-null"
}
```
