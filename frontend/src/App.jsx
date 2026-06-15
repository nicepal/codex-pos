import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectAuth, selectIsPlatformAdmin } from './features/auth/authSlice';
import AuthInit from './components/AuthInit';
import LoadingState from './components/LoadingState';

import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPassword';
import ResetPasswordPage from './pages/auth/ResetPassword';
import AdminLayout from './layouts/AdminLayout';
import BusinessLayout from './layouts/BusinessLayout';
import StorefrontLayout from './layouts/StorefrontLayout';

import AdminDashboard from './pages/admin/Dashboard';
import BusinessesPage from './pages/admin/Businesses';
import BusinessDetailPage from './pages/admin/BusinessDetail';
import PlansPage from './pages/admin/Plans';
import BillingPage from './pages/admin/Billing';
import InvoiceDetailPage from './pages/admin/InvoiceDetail';
import TicketsPage from './pages/admin/Tickets';
import TicketDetailPage from './pages/admin/TicketDetail';
import AuditLogsPage from './pages/admin/AuditLogs';
import AffiliatesPage from './pages/admin/Affiliates';
import CouponsPage from './pages/admin/Coupons';
import CmsPage from './pages/admin/Cms';
import NotificationsAdminPage from './pages/admin/Notifications';
import ImpersonationLogsPage from './pages/admin/ImpersonationLogs';
import SubscriptionOverviewPage from './pages/admin/SubscriptionOverview';

import BusinessDashboard from './pages/business/Dashboard';
import ProductsPage from './pages/business/Products';
import ProductDetailPage from './pages/business/ProductDetail';
import CategoriesPage from './pages/business/Categories';
import OrdersPage from './pages/business/Orders';
import OrderDetailPage from './pages/business/OrderDetail';
import CustomersPage from './pages/business/Customers';
import CustomerDetailPage from './pages/business/CustomerDetail';
import InventoryPage from './pages/business/Inventory';
import ReportsPage from './pages/business/Reports';
import SettingsPage from './pages/business/Settings';
import POSPage from './pages/business/POS';
import SubscriptionPage from './pages/business/Subscription';
import BranchesPage from './pages/business/Branches';
import EmployeesPage from './pages/business/Employees';
import SuppliersPage from './pages/business/Suppliers';
import ExpensesPage from './pages/business/Expenses';
import SupportPage from './pages/business/Support';
import SupportDetailPage from './pages/business/SupportDetail';
import BrandsPage from './pages/business/Brands';
import PurchaseOrdersPage from './pages/business/PurchaseOrders';
import TeamPage from './pages/business/Team';
import NotFoundPage from './pages/NotFound';

import StoreHome from './pages/storefront/Home';
import StoreShop from './pages/storefront/Shop';
import StoreProduct from './pages/storefront/Product';
import StoreCart from './pages/storefront/Cart';
import CheckoutPage from './pages/storefront/Checkout';
import OrderConfirmationPage from './pages/storefront/OrderConfirmation';

function ProtectedRoute({ children, platformOnly = false, businessOnly = false }) {
  const { isAuthenticated, hydrating } = useSelector(selectAuth);
  const isPlatformAdmin = useSelector(selectIsPlatformAdmin);

  if (hydrating) return <LoadingState />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (platformOnly && !isPlatformAdmin) return <Navigate to="/dashboard" replace />;
  if (businessOnly && isPlatformAdmin) return <Navigate to="/admin" replace />;

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route path="/admin" element={<ProtectedRoute platformOnly><AdminLayout /></ProtectedRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="businesses" element={<BusinessesPage />} />
        <Route path="businesses/:id" element={<BusinessDetailPage />} />
        <Route path="plans" element={<PlansPage />} />
        <Route path="billing" element={<BillingPage />} />
        <Route path="billing/:id" element={<InvoiceDetailPage />} />
        <Route path="tickets" element={<TicketsPage />} />
        <Route path="tickets/:id" element={<TicketDetailPage />} />
        <Route path="audit-logs" element={<AuditLogsPage />} />
        <Route path="impersonation-logs" element={<ImpersonationLogsPage />} />
        <Route path="affiliates" element={<AffiliatesPage />} />
        <Route path="coupons" element={<CouponsPage />} />
        <Route path="cms" element={<CmsPage />} />
        <Route path="notifications" element={<NotificationsAdminPage />} />
        <Route path="subscriptions" element={<SubscriptionOverviewPage />} />
      </Route>

      <Route path="/" element={<ProtectedRoute businessOnly><BusinessLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<BusinessDashboard />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="products/:id" element={<ProductDetailPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="orders/:id" element={<OrderDetailPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="customers/:id" element={<CustomerDetailPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="subscription" element={<SubscriptionPage />} />
        <Route path="branches" element={<BranchesPage />} />
        <Route path="employees" element={<EmployeesPage />} />
        <Route path="suppliers" element={<SuppliersPage />} />
        <Route path="expenses" element={<ExpensesPage />} />
        <Route path="support" element={<SupportPage />} />
        <Route path="support/:id" element={<SupportDetailPage />} />
        <Route path="brands" element={<BrandsPage />} />
        <Route path="purchase-orders" element={<PurchaseOrdersPage />} />
        <Route path="team" element={<TeamPage />} />
        <Route path="pos" element={<POSPage />} />
      </Route>

      <Route path="/store" element={<Navigate to="/store/demo" replace />} />
      <Route path="/store/:slug" element={<StorefrontLayout />}>
        <Route index element={<StoreHome />} />
        <Route path="shop" element={<StoreShop />} />
        <Route path="product/:productSlug" element={<StoreProduct />} />
        <Route path="cart" element={<StoreCart />} />
        <Route path="checkout" element={<CheckoutPage />} />
        <Route path="order/confirm" element={<OrderConfirmationPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthInit>
        <AppRoutes />
      </AuthInit>
    </BrowserRouter>
  );
}
