import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Dashboard, Inventory, ShoppingCart, People, Assessment, PointOfSale,
  Warehouse, Category, Settings, CreditCard, Store, Support,
  LocalShipping, Receipt, Groups, Label, ShoppingBag, Badge, Storefront, AutoAwesome, Code, Star,
  CloudSync,
} from '@mui/icons-material';
import { logout, selectAuth } from '../features/auth/authSlice';
import ResponsiveDrawer from '../components/ResponsiveDrawer';
import NotificationBell from '../components/NotificationBell';
import useTenantFeatures from '../hooks/useTenantFeatures';
import { filterNavGroups, SHOP_FEATURE } from '../config/featureNav';
import { BusinessCurrencyProvider } from '../contexts/BusinessCurrencyContext';

export default function BusinessLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { user, tenant } = useSelector(selectAuth);

  const shopSlug = tenant?.slug || (typeof window !== 'undefined' ? localStorage.getItem('tenantSlug') : null);
  const shopPath = shopSlug ? `/store/${shopSlug}` : null;

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(`${path}/`);

  const { hasFeature } = useTenantFeatures();

  const navGroups = filterNavGroups([
    {
      label: 'Sales',
      items: [
        { label: 'Dashboard', path: '/dashboard', icon: <Dashboard />, selected: isActive('/dashboard'), onClick: () => navigate('/dashboard') },
        { label: 'POS', path: '/pos', icon: <PointOfSale />, selected: isActive('/pos'), onClick: () => navigate('/pos') },
        { label: 'Drawer', path: '/drawer', icon: <Receipt />, selected: isActive('/drawer'), onClick: () => navigate('/drawer') },
        { label: 'Orders', path: '/orders', icon: <ShoppingCart />, selected: isActive('/orders'), onClick: () => navigate('/orders') },
        ...(shopPath ? [{
          label: 'My Shop',
          path: shopPath,
          icon: <Storefront />,
          selected: false,
          onClick: () => window.open(shopPath, '_blank', 'noopener,noreferrer'),
        }] : []),
      ],
    },
    {
      label: 'Catalog',
      items: [
        { label: 'Products', path: '/products', icon: <Inventory />, selected: isActive('/products'), onClick: () => navigate('/products') },
        { label: 'Categories', path: '/categories', icon: <Category />, selected: isActive('/categories'), onClick: () => navigate('/categories') },
        { label: 'Brands', path: '/brands', icon: <Label />, selected: isActive('/brands'), onClick: () => navigate('/brands') },
        { label: 'Coupons', path: '/coupons', icon: <Receipt />, selected: isActive('/coupons'), onClick: () => navigate('/coupons') },
        { label: 'Gift Cards', path: '/gift-cards', icon: <CreditCard />, selected: isActive('/gift-cards'), onClick: () => navigate('/gift-cards') },
        { label: 'Reviews', path: '/reviews', icon: <Star />, selected: isActive('/reviews'), onClick: () => navigate('/reviews') },
        { label: 'Sales Channels', path: '/marketplace', icon: <Storefront />, selected: isActive('/marketplace'), onClick: () => navigate('/marketplace') },
      ],
    },
    {
      label: 'Operations',
      items: [
        { label: 'Inventory', path: '/inventory', icon: <Warehouse />, selected: isActive('/inventory'), onClick: () => navigate('/inventory') },
        { label: 'Transfers', path: '/transfers', icon: <LocalShipping />, selected: isActive('/transfers'), onClick: () => navigate('/transfers') },
        { label: 'Stock Take', path: '/stock-take', icon: <Warehouse />, selected: isActive('/stock-take'), onClick: () => navigate('/stock-take') },
        { label: 'Suppliers', path: '/suppliers', icon: <LocalShipping />, selected: isActive('/suppliers'), onClick: () => navigate('/suppliers') },
        { label: 'Purchase Orders', path: '/purchase-orders', icon: <ShoppingBag />, selected: isActive('/purchase-orders'), onClick: () => navigate('/purchase-orders') },
        { label: 'Expenses', path: '/expenses', icon: <Receipt />, selected: isActive('/expenses'), onClick: () => navigate('/expenses') },
      ],
    },
    {
      label: 'People',
      items: [
        { label: 'Customers', path: '/customers', icon: <People />, selected: isActive('/customers'), onClick: () => navigate('/customers') },
        { label: 'Employees', path: '/employees', icon: <Groups />, selected: isActive('/employees'), onClick: () => navigate('/employees') },
        { label: 'Team', path: '/team', icon: <Badge />, selected: isActive('/team'), onClick: () => navigate('/team') },
      ],
    },
    {
      label: 'Insights',
      items: [
        { label: 'Reports', path: '/reports', icon: <Assessment />, selected: isActive('/reports'), onClick: () => navigate('/reports') },
        { label: 'AI Insights', path: '/ai-insights', icon: <AutoAwesome />, selected: isActive('/ai-insights'), onClick: () => navigate('/ai-insights') },
      ],
    },
    {
      label: 'Integrations',
      items: [
        { label: 'Shopify', path: '/integrations/shopify', icon: <CloudSync />, selected: isActive('/integrations/shopify'), onClick: () => navigate('/integrations/shopify') },
      ],
    },
    {
      label: 'Account',
      items: [
        { label: 'Support', path: '/support', icon: <Support />, selected: isActive('/support'), onClick: () => navigate('/support') },
        { label: 'Branches', path: '/branches', icon: <Store />, selected: isActive('/branches'), onClick: () => navigate('/branches') },
        { label: 'Subscription', path: '/subscription', icon: <CreditCard />, selected: isActive('/subscription'), onClick: () => navigate('/subscription') },
        { label: 'Developers', path: '/developers', icon: <Code />, selected: isActive('/developers'), onClick: () => navigate('/developers') },
        { label: 'Settings', path: '/settings', icon: <Settings />, selected: isActive('/settings'), onClick: () => navigate('/settings') },
      ],
    },
  ], hasFeature, { showShop: hasFeature(SHOP_FEATURE) });

  return (
    <BusinessCurrencyProvider>
      <ResponsiveDrawer
        title="EYZ POS"
        subtitle={tenant?.name || 'My Business'}
        navGroups={navGroups}
        user={{ email: user?.email, initial: user?.first_name?.[0] }}
        headerExtra={<NotificationBell />}
        onLogout={() => { dispatch(logout()); navigate('/login'); }}
      >
        <Outlet />
      </ResponsiveDrawer>
    </BusinessCurrencyProvider>
  );
}
