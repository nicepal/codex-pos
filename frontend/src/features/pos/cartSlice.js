import { createSlice, createSelector } from '@reduxjs/toolkit';

const DEFAULT_RESTAURANT = {
  posMode: 'retail',
  orderType: null,
  tableId: null,
  tableName: null,
  floorName: null,
  diningSessionId: null,
  guestCount: null,
  serverEmployeeId: null,
  serverName: null,
  existingOrderId: null,
  kitchenSent: false,
};

const cartSlice = createSlice({
  name: 'cart',
  initialState: {
    items: [],
    customer: null,
    discount: 0,
    notes: '',
    restaurant: { ...DEFAULT_RESTAURANT },
  },
  reducers: {
    addItem(state, action) {
      const payload = action.payload;
      const modifierKey = (payload.selected_modifiers || []).slice().sort().join(',');
      const serialKey = (payload.serial_numbers || []).join(',') || payload.serial_number || '';
      const existing = state.items.find(
        (i) => !i.voided
          && i.product_id === payload.product_id
          && i.variant_id === payload.variant_id
          && ((i.serial_numbers || []).join(',') || i.serial_number || '') === serialKey
          && (i.batch_id || null) === (payload.batch_id || null)
          && ((i.selected_modifiers || []).slice().sort().join(',')) === modifierKey
          && (i.item_notes || '') === (payload.item_notes || '')
      );
      if (existing && !serialKey) {
        existing.quantity += payload.quantity || 1;
      } else {
        state.items.push({ ...payload, quantity: payload.quantity || 1, voided: false });
      }
    },
    removeItem(state, action) {
      state.items = state.items.filter((_, idx) => idx !== action.payload);
    },
    voidLine(state, action) {
      const { index, reason, authorizedBy } = action.payload;
      const line = state.items[index];
      if (!line) return;
      line.voided = true;
      line.void_reason = reason || '';
      line.void_authorized_by = authorizedBy || null;
    },
    setLinePrice(state, action) {
      const { index, unit_price, reason, authorizedBy } = action.payload;
      const line = state.items[index];
      if (!line) return;
      line.unit_price = unit_price;
      line.price_override_reason = reason || '';
      line.price_override_by = authorizedBy || null;
      line.price_override_approved = true;
    },
    updateQuantity(state, action) {
      const { index, quantity } = action.payload;
      if (quantity <= 0) {
        state.items.splice(index, 1);
      } else {
        state.items[index].quantity = quantity;
      }
    },
    setCustomer(state, action) {
      state.customer = action.payload;
    },
    setDiscount(state, action) {
      state.discount = action.payload;
    },
    setLineDiscount(state, action) {
      const { index, discount } = action.payload;
      if (state.items[index] && !state.items[index].voided) {
        state.items[index].line_discount = discount || 0;
      }
    },
    setNotes(state, action) {
      state.notes = action.payload;
    },
    setPosMode(state, action) {
      state.restaurant.posMode = action.payload;
      if (action.payload === 'retail') {
        state.restaurant.orderType = null;
        state.restaurant.tableId = null;
        state.restaurant.tableName = null;
        state.restaurant.floorName = null;
        state.restaurant.diningSessionId = null;
        state.restaurant.guestCount = null;
        state.restaurant.serverEmployeeId = null;
        state.restaurant.serverName = null;
        state.restaurant.existingOrderId = null;
        state.restaurant.kitchenSent = false;
      }
    },
    setRestaurantOrderType(state, action) {
      state.restaurant.orderType = action.payload;
      if (action.payload === 'takeaway') {
        state.restaurant.tableId = null;
        state.restaurant.tableName = null;
        state.restaurant.floorName = null;
        state.restaurant.diningSessionId = null;
        state.restaurant.existingOrderId = null;
        state.restaurant.kitchenSent = false;
      }
    },
    setRestaurantContext(state, action) {
      state.restaurant = { ...state.restaurant, ...action.payload };
    },
    clearRestaurantTable(state) {
      state.restaurant.tableId = null;
      state.restaurant.tableName = null;
      state.restaurant.floorName = null;
      state.restaurant.diningSessionId = null;
      state.restaurant.guestCount = null;
      state.restaurant.serverEmployeeId = null;
      state.restaurant.serverName = null;
      state.restaurant.existingOrderId = null;
      state.restaurant.kitchenSent = false;
    },
    setKitchenSent(state, action) {
      state.restaurant.kitchenSent = action.payload;
      if (action.payload) {
        state.items.forEach((item) => {
          if (!item.voided && !item.kitchen_status) item.kitchen_sent = true;
        });
      }
    },
    markItemsKitchenSent(state) {
      state.items.forEach((item) => {
        if (!item.voided && item.kitchen_sent) {
          item.kitchen_status = item.kitchen_status || 'sent';
          item.kitchen_sent = false;
        }
      });
      state.restaurant.kitchenSent = false;
    },
    applyKitchenStatuses(state, action) {
      const statuses = action.payload || {};
      state.items.forEach((item) => {
        if (item.order_item_id && statuses[item.order_item_id]) {
          item.kitchen_status = statuses[item.order_item_id];
          item.kitchen_sent = false;
        }
      });
    },
    syncOrderItemIds(state, action) {
      const { orderId, items } = action.payload;
      if (orderId) state.restaurant.existingOrderId = orderId;
      (items || []).forEach((serverItem) => {
        const match = state.items.find(
          (i) => !i.voided && !i.order_item_id
            && i.product_id === serverItem.product_id
            && (i.variant_id || null) === (serverItem.variant_id || null)
        );
        if (match) {
          match.order_item_id = serverItem.id;
          match.kitchen_status = serverItem.kitchen_status || match.kitchen_status || null;
        }
      });
    },
    clearCart(state) {
      state.items = [];
      state.customer = null;
      state.discount = 0;
      state.notes = '';
    },
    clearCartAndRestaurant(state) {
      state.items = [];
      state.customer = null;
      state.discount = 0;
      state.notes = '';
      state.restaurant = { ...DEFAULT_RESTAURANT, posMode: state.restaurant.posMode };
    },
    loadCart(state, action) {
      const { items, discount, notes, restaurant } = action.payload;
      state.items = items || [];
      state.discount = discount || 0;
      state.notes = notes || '';
      if (restaurant) {
        state.restaurant = { ...state.restaurant, ...restaurant };
      }
    },
  },
});

export const {
  addItem, removeItem, voidLine, setLinePrice, updateQuantity,
  setCustomer, setDiscount, setLineDiscount, setNotes, clearCart, clearCartAndRestaurant, loadCart,
  setPosMode, setRestaurantOrderType, setRestaurantContext, clearRestaurantTable, setKitchenSent, markItemsKitchenSent,
  applyKitchenStatuses, syncOrderItemIds,
} = cartSlice.actions;

const selectCartItems = (state) => state.cart.items;
const selectCartDiscount = (state) => state.cart.discount;

export const selectCartSubtotal = createSelector(
  [selectCartItems],
  (items) => items.reduce((sum, i) => {
    if (i.voided) return sum;
    const lineDisc = i.line_discount || 0;
    return sum + i.unit_price * i.quantity - lineDisc;
  }, 0),
);

export const selectCartTotal = createSelector(
  [selectCartSubtotal, selectCartDiscount],
  (subtotal, discount) => ({ subtotal, total: subtotal - discount }),
);

export const selectActiveItems = (state) => state.cart.items.filter((i) => !i.voided);
export const selectRestaurantContext = (state) => state.cart.restaurant;

export default cartSlice.reducer;
