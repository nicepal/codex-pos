import { createContext, useContext } from 'react';

export const StorefrontUIContext = createContext(null);

export function useStorefrontUI() {
  return useContext(StorefrontUIContext);
}
