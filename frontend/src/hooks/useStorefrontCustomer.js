import { useEffect, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import storefrontApi, { getStoreToken, setStoreToken, clearStoreToken } from '../services/storefrontApi';

export function useStorefrontCustomer() {
  const queryClient = useQueryClient();
  const [token, setToken] = useState(() => getStoreToken());
  const hasToken = Boolean(token);

  const meQuery = useQuery({
    queryKey: ['storefront-me'],
    queryFn: () => storefrontApi.get('/storefront/account/me').then((r) => r.data.data),
    enabled: hasToken,
    retry: false,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (meQuery.isError && getStoreToken()) {
      clearStoreToken();
      setToken(null);
      queryClient.removeQueries({ queryKey: ['storefront-me'] });
    }
  }, [meQuery.isError, queryClient]);

  const customer = meQuery.data || null;
  const isLoggedIn = Boolean(hasToken && customer);

  const login = useCallback(async (payload) => {
    const res = await storefrontApi.post('/storefront/account/login', payload);
    const next = res.data.data.token;
    setStoreToken(next);
    setToken(next);
    await queryClient.invalidateQueries({ queryKey: ['storefront-me'] });
    return res.data.data;
  }, [queryClient]);

  const register = useCallback(async (payload) => {
    const res = await storefrontApi.post('/storefront/account/register', payload);
    const next = res.data.data.token;
    setStoreToken(next);
    setToken(next);
    await queryClient.invalidateQueries({ queryKey: ['storefront-me'] });
    return res.data.data;
  }, [queryClient]);

  const logout = useCallback(() => {
    clearStoreToken();
    setToken(null);
    queryClient.removeQueries({ queryKey: ['storefront-me'] });
    queryClient.removeQueries({ queryKey: ['storefront-my-orders'] });
    queryClient.removeQueries({ queryKey: ['storefront-wishlist'] });
  }, [queryClient]);

  return {
    customer,
    isLoggedIn,
    isLoading: hasToken && meQuery.isLoading,
    login,
    register,
    logout,
    displayName: customer
      ? [customer.first_name, customer.last_name].filter(Boolean).join(' ').trim() || customer.email
      : null,
  };
}
