import { createContext, useContext, useEffect } from 'react';
import { useParams, useNavigate, Outlet } from 'react-router-dom';

const StoreTenantContext = createContext({ slug: 'demo', basePath: '/store/demo' });

export function useStoreTenant() {
  return useContext(StoreTenantContext);
}

export function StoreTenantProvider() {
  const { slug = 'demo' } = useParams();
  const navigate = useNavigate();
  const basePath = `/store/${slug}`;

  useEffect(() => {
    localStorage.setItem('tenantSlug', slug);
  }, [slug]);

  return (
    <StoreTenantContext.Provider value={{ slug, basePath, navigate }}>
      <Outlet />
    </StoreTenantContext.Provider>
  );
}
