import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import cartReducer from '../features/pos/cartSlice';
import storefrontCartReducer from '../features/storefront/cartSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    cart: cartReducer,
    storefrontCart: storefrontCartReducer,
  },
});
