import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import {
  Dashboard, Business, CreditCard, Receipt, Support, History, People, LocalOffer, Article, Notifications, Security,
} from '@mui/icons-material';
import { logout } from '../features/auth/authSlice';
import ResponsiveDrawer from '../components/ResponsiveDrawer';

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const isActive = (path) => {
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const navGroups = [
    {
      label: 'Platform',
      collapsible: false,
      items: [
        { label: 'Dashboard', path: '/admin', icon: <Dashboard />, selected: isActive('/admin'), onClick: () => navigate('/admin') },
        { label: 'Businesses', path: '/admin/businesses', icon: <Business />, selected: isActive('/admin/businesses'), onClick: () => navigate('/admin/businesses') },
        { label: 'Plans', path: '/admin/plans', icon: <CreditCard />, selected: isActive('/admin/plans'), onClick: () => navigate('/admin/plans') },
        { label: 'Subscriptions', path: '/admin/subscriptions', icon: <CreditCard />, selected: isActive('/admin/subscriptions'), onClick: () => navigate('/admin/subscriptions') },
        { label: 'Billing', path: '/admin/billing', icon: <Receipt />, selected: isActive('/admin/billing'), onClick: () => navigate('/admin/billing') },
        { label: 'Coupons', path: '/admin/coupons', icon: <LocalOffer />, selected: isActive('/admin/coupons'), onClick: () => navigate('/admin/coupons') },
        { label: 'Support Tickets', path: '/admin/tickets', icon: <Support />, selected: isActive('/admin/tickets'), onClick: () => navigate('/admin/tickets') },
        { label: 'Audit Logs', path: '/admin/audit-logs', icon: <History />, selected: isActive('/admin/audit-logs'), onClick: () => navigate('/admin/audit-logs') },
        { label: 'Impersonation', path: '/admin/impersonation-logs', icon: <Security />, selected: isActive('/admin/impersonation-logs'), onClick: () => navigate('/admin/impersonation-logs') },
        { label: 'Affiliates', path: '/admin/affiliates', icon: <People />, selected: isActive('/admin/affiliates'), onClick: () => navigate('/admin/affiliates') },
        { label: 'CMS', path: '/admin/cms', icon: <Article />, selected: isActive('/admin/cms'), onClick: () => navigate('/admin/cms') },
        { label: 'Notifications', path: '/admin/notifications', icon: <Notifications />, selected: isActive('/admin/notifications'), onClick: () => navigate('/admin/notifications') },
      ],
    },
  ];

  return (
    <ResponsiveDrawer
      title="Codex POS Admin"
      subtitle="Super Admin Panel"
      navGroups={navGroups}
      user={{ email: 'admin', initial: 'A' }}
      onLogout={() => { dispatch(logout()); navigate('/login'); }}
    >
      <Outlet />
    </ResponsiveDrawer>
  );
}
