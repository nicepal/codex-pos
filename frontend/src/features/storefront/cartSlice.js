import { createSlice } from '@reduxjs/toolkit';

const storefrontCartSlice = createSlice({
  name: 'storefrontCart',
  initialState: { items: [] },
  reducers: {
    addToCart(state, action) {
      const { quantity = 1, ...item } = action.payload;
      const existing = state.items.find((i) => i.product_id === item.product_id);
      if (existing) existing.quantity += quantity;
      else state.items.push({ ...item, quantity });
    },
    removeFromCart(state, action) {
      state.items.splice(action.payload, 1);
    },
    updateCartQty(state, action) {
      const { index, quantity } = action.payload;
      if (quantity <= 0) state.items.splice(index, 1);
      else state.items[index].quantity = quantity;
    },
    clearStoreCart(state) {
      state.items = [];
    },
  },
});

export const { addToCart, removeFromCart, updateCartQty, clearStoreCart } = storefrontCartSlice.actions;
export const selectStoreCartTotal = (state) =>
  state.storefrontCart.items.reduce((s, i) => s + i.sale_price * i.quantity, 0);
export default storefrontCartSlice.reducer;
