import Hero from '../sections/Hero';
import TrustIcons from '../sections/TrustIcons';
import FeatureBlocks from '../sections/FeatureBlocks';
import ProductShowcase from '../sections/ProductShowcase';
import BusinessTypes from '../sections/BusinessTypes';
import HowItWorks from '../sections/HowItWorks';
import InventorySection from '../sections/InventorySection';
import AnalyticsDemo from '../sections/AnalyticsDemo';
import MultiBranch from '../sections/MultiBranch';
import StorefrontSection from '../sections/StorefrontSection';
import PricingTeaser from '../sections/PricingTeaser';
import Integrations from '../sections/Integrations';
import DeveloperPlatform from '../sections/DeveloperPlatform';
import FaqTeaser from '../sections/FaqTeaser';
import FinalCta from '../sections/FinalCta';
import { usePageMeta } from '../hooks/usePageMeta';

export default function HomePage() {
  usePageMeta({
    title: 'PosHive — POS, Inventory & Storefront',
    description:
      'Multi-tenant POS, inventory, and storefront platform. Plans from $29/mo with trials. Shopify import, Stripe billing, API & webhooks.',
    path: '/',
  });

  return (
    <>
      <Hero />
      <TrustIcons />
      <FeatureBlocks />
      <ProductShowcase />
      <BusinessTypes />
      <HowItWorks />
      <InventorySection />
      <AnalyticsDemo />
      <MultiBranch />
      <StorefrontSection />
      <PricingTeaser />
      <Integrations />
      <DeveloperPlatform />
      <FaqTeaser />
      <FinalCta />
    </>
  );
}
