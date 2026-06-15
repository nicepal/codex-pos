import { createSlice } from '@reduxjs/toolkit';

const cartSlice = createSlice({
  name: 'cart',
  initialState: {
    items: [],
    customer: null,
    discount: 0,
    notes: '',
    heldOrders: [],
  },
  reducers: {
    addItem(state, action) {
      const existing = state.items.find(
        (i) => i.product_id === action.payload.product_id && i.variant_id === action.payload.variant_id
      );
      if (existing) {
        existing.quantity += action.payload.quantity || 1;
      } else {
        state.items.push({ ...action.payload, quantity: action.payload.quantity || 1 });
      }
    },
    removeItem(state, action) {
      state.items = state.items.filter((_, idx) => idx !== action.payload);
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
    setNotes(state, action) {
      state.notes = action.payload;
    },
    clearCart(state) {
      state.items = [];
      state.customer = null;
      state.discount = 0;
      state.notes = '';
    },
    loadCart(state, action) {
      const { items, discount, notes } = action.payload;
      state.items = items || [];
      state.discount = discount || 0;
      state.notes = notes || '';
    },
  },
});

export const { addItem, removeItem, updateQuantity, setCustomer, setDiscount, setNotes, clearCart, loadCart } = cartSlice.actions;

export const selectCartTotal = (state) => {
  const subtotal = state.cart.items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
  return { subtotal, total: subtotal - state.cart.discount };
};

export default cartSlice.reducer;
