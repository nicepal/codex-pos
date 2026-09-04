import { useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import storefrontApi, { getStoreToken, setStoreToken, clearStoreToken } from '../services/storefrontApi';

const TOKEN_KEY = ['storefront-token'];
const ME_KEY = ['storefront-me'];

/**
 * Shared storefront customer session (token + profile) via React Query
 * so login in one component updates header / account / reviews immediately.
 */
export function useStorefrontCustomer() {
  const queryClient = useQueryClient();

  const { data: token } = useQuery({
    queryKey: TOKEN_KEY,
    queryFn: () => getStoreToken(),
    staleTime: Infinity,
    gcTime: Infinity,
    initialData: () => getStoreToken(),
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const hasToken = Boolean(token);

  const meQuery = useQuery({
    queryKey: ME_KEY,
    queryFn: () => storefrontApi.get('/storefront/account/me').then((r) => r.data.data),
    enabled: hasToken,
    retry: false,
    staleTime: 60_000,
  });

  const clearSession = useCallback(() => {
    clearStoreToken();
    queryClient.setQueryData(TOKEN_KEY, null);
    queryClient.removeQueries({ queryKey: ME_KEY });
    queryClient.removeQueries({ queryKey: ['storefront-my-orders'] });
    queryClient.removeQueries({ queryKey: ['storefront-wishlist'] });
  }, [queryClient]);

  useEffect(() => {
    if (hasToken && meQuery.isError) {
      clearSession();
    }
  }, [hasToken, meQuery.isError, clearSession]);

  const customer = meQuery.data || null;
  const isLoggedIn = Boolean(hasToken && customer);

  const applySession = useCallback((payload) => {
    const nextToken = payload?.token;
    const nextCustomer = payload?.customer;
    if (!nextToken) return payload;
    setStoreToken(nextToken);
    queryClient.setQueryData(TOKEN_KEY, nextToken);
    if (nextCustomer) {
      queryClient.setQueryData(ME_KEY, nextCustomer);
    } else {
      queryClient.invalidateQueries({ queryKey: ME_KEY });
    }
    return payload;
  }, [queryClient]);

  const login = useCallback(async (payload) => {
    const res = await storefrontApi.post('/storefront/account/login', payload);
    return applySession(res.data.data);
  }, [applySession]);

  const register = useCallback(async (payload) => {
    const res = await storefrontApi.post('/storefront/account/register', payload);
    return applySession(res.data.data);
  }, [applySession]);

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  return {
    customer,
    isLoggedIn,
    isLoading: hasToken && meQuery.isLoading && !customer,
    login,
    register,
    logout,
    displayName: customer
      ? [customer.first_name, customer.last_name].filter(Boolean).join(' ').trim() || customer.email
      : null,
  };
}
