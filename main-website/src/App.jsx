import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import HomePage from './pages/HomePage';
import FeaturesPage from './pages/FeaturesPage';
import FeatureDetailPage from './pages/FeatureDetailPage';
import PricingPage from './pages/PricingPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import FaqPage from './pages/FaqPage';
import BlogPage from './pages/BlogPage';
import BlogArticlePage from './pages/BlogArticlePage';
import ShopifyPage from './pages/ShopifyPage';
import LoginRedirectPage from './pages/LoginRedirectPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route index element={<HomePage />} />
          <Route path="features" element={<FeaturesPage />} />
          <Route path="features/pos" element={<FeatureDetailPage featureKey="pos" />} />
          <Route path="features/inventory" element={<FeatureDetailPage featureKey="inventory" />} />
          <Route path="features/ecommerce" element={<FeatureDetailPage featureKey="ecommerce" />} />
          <Route path="features/analytics" element={<FeatureDetailPage featureKey="analytics" />} />
          <Route path="integrations/shopify" element={<ShopifyPage />} />
          <Route path="pricing" element={<PricingPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="faq" element={<FaqPage />} />
          <Route path="blog" element={<BlogPage />} />
          <Route path="blog/:slug" element={<BlogArticlePage />} />
          <Route path="login" element={<LoginRedirectPage />} />
          <Route path="home" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
