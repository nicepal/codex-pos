export const EMPTY_PRESETS = {
  brands: {
    title: 'No brands yet',
    message: "You haven't added any brands. Get started by creating your first brand.",
    actionLabel: 'Add Brand',
    illustration: 'store',
    benefits: [
      { icon: 'tag', title: 'Organize products', description: 'Group products by brand for better organization.' },
      { icon: 'chart', title: 'Easier reporting', description: 'Track sales and performance by brand in reports.' },
      { icon: 'people', title: 'Better customer experience', description: 'Help customers find products from trusted brands.' },
    ],
  },
  products: {
    title: 'No products yet',
    message: "You haven't added any products. Create your first product to start selling.",
    actionLabel: 'Add Product',
    illustration: 'products',
    benefits: [
      { icon: 'tag', title: 'Build your catalog', description: 'Add items with pricing, SKU, and stock levels.' },
      { icon: 'chart', title: 'Sell in-store & online', description: 'Products sync across POS and your storefront.' },
      { icon: 'inventory', title: 'Track inventory', description: 'Monitor stock and get alerts when items run low.' },
    ],
  },
  categories: {
    title: 'No categories yet',
    message: "Organize your catalog by creating product categories.",
    actionLabel: 'Add Category',
    illustration: 'categories',
    benefits: [
      { icon: 'tag', title: 'Structured catalog', description: 'Group related products for faster browsing.' },
      { icon: 'chart', title: 'Storefront navigation', description: 'Categories appear on your online shop.' },
      { icon: 'inventory', title: 'Easier management', description: 'Filter and report on products by category.' },
    ],
  },
  employees: {
    title: 'No employees yet',
    message: "Add staff members to assign roles and manage POS access.",
    actionLabel: 'Add Employee',
    illustration: 'people',
    benefits: [
      { icon: 'people', title: 'Role-based access', description: 'Assign cashier or manager permissions.' },
      { icon: 'chart', title: 'Track activity', description: 'See who processed sales and orders.' },
      { icon: 'tag', title: 'Scale your team', description: 'Add employees as your business grows.' },
    ],
  },
  suppliers: {
    title: 'No suppliers yet',
    message: "Add vendors you purchase from to manage supply chain contacts.",
    actionLabel: 'Add Supplier',
    illustration: 'suppliers',
    benefits: [
      { icon: 'tag', title: 'Vendor directory', description: 'Keep supplier contact details in one place.' },
      { icon: 'inventory', title: 'Purchase orders', description: 'Link suppliers when creating purchase orders.' },
      { icon: 'chart', title: 'Better planning', description: 'Track who you buy from and reorder faster.' },
    ],
  },
  expenses: {
    title: 'No expenses yet',
    message: "Start tracking business spending to understand your costs.",
    actionLabel: 'Add Expense',
    illustration: 'orders',
    benefits: [
      { icon: 'chart', title: 'Cost visibility', description: 'See spending by category and date range.' },
      { icon: 'tag', title: 'Tax-ready records', description: 'Keep organized records of business expenses.' },
      { icon: 'inventory', title: 'Profit insights', description: 'Compare expenses against revenue in reports.' },
    ],
  },
  team: {
    title: 'No team members yet',
    message: "Invite colleagues to help manage your store and POS.",
    actionLabel: 'Invite Member',
    illustration: 'people',
    benefits: [
      { icon: 'people', title: 'Collaborate', description: 'Invite managers and cashiers to your account.' },
      { icon: 'tag', title: 'Secure access', description: 'Each member gets their own login and role.' },
      { icon: 'chart', title: 'Shared operations', description: 'Work together on orders, inventory, and sales.' },
    ],
  },
  customers: {
    title: 'No customers yet',
    message: "Add customers to track loyalty points and purchase history.",
    actionLabel: 'Add Customer',
    illustration: 'customers',
    benefits: [
      { icon: 'people', title: 'Customer profiles', description: 'Store contact info and purchase preferences.' },
      { icon: 'tag', title: 'Loyalty rewards', description: 'Earn and redeem points on future purchases.' },
      { icon: 'chart', title: 'Order history', description: 'View past orders and credit balances.' },
    ],
  },
  orders: {
    title: 'No orders yet',
    message: "Orders from POS and your online shop will appear here.",
    illustration: 'orders',
    benefits: [
      { icon: 'chart', title: 'Unified orders', description: 'POS and storefront orders in one place.' },
      { icon: 'tag', title: 'Status tracking', description: 'Monitor pending, paid, and completed orders.' },
      { icon: 'people', title: 'Customer details', description: 'See who placed each order and when.' },
    ],
  },
  purchaseOrders: {
    title: 'No purchase orders yet',
    message: "Create purchase orders to restock inventory from suppliers.",
    actionLabel: 'New PO',
    illustration: 'suppliers',
    benefits: [
      { icon: 'inventory', title: 'Restock inventory', description: 'Order products from your suppliers.' },
      { icon: 'tag', title: 'Track deliveries', description: 'Monitor PO status from draft to received.' },
      { icon: 'chart', title: 'Cost control', description: 'Record purchase costs for accurate margins.' },
    ],
  },
  inventory: {
    title: 'All stocked up',
    message: 'No low-stock alerts right now. Inventory levels look healthy.',
    illustration: 'products',
    benefits: [
      { icon: 'inventory', title: 'Real-time stock', description: 'Levels update with every sale and adjustment.' },
      { icon: 'chart', title: 'Low-stock alerts', description: 'Get notified when items need reordering.' },
      { icon: 'tag', title: 'Adjustment history', description: 'Review all stock movements in the log below.' },
    ],
  },
  support: {
    title: 'No support tickets yet',
    message: "Submit a ticket when you need help from our support team.",
    actionLabel: 'New Ticket',
    illustration: 'support',
    benefits: [
      { icon: 'support', title: 'Get help fast', description: 'Our team responds to your questions promptly.' },
      { icon: 'tag', title: 'Track progress', description: 'Follow ticket status from open to resolved.' },
      { icon: 'people', title: 'Dedicated support', description: 'Reach out for setup, billing, or technical issues.' },
    ],
  },
  transactions: {
    title: 'No transactions yet',
    message: 'Stock adjustments and movements will be logged here.',
    illustration: 'inventory',
    benefits: [
      { icon: 'inventory', title: 'Full audit trail', description: 'Every stock change is recorded automatically.' },
      { icon: 'chart', title: 'Identify trends', description: 'See which products move fastest.' },
      { icon: 'tag', title: 'Accurate counts', description: 'Reconcile physical stock with system records.' },
    ],
  },
  businesses: {
    title: 'No businesses yet',
    message: 'Create your first tenant to onboard a store onto the platform.',
    actionLabel: 'Add Business',
    illustration: 'business',
    benefits: [
      { icon: 'tag', title: 'Multi-tenant platform', description: 'Each business gets its own POS, inventory, and storefront.' },
      { icon: 'chart', title: 'Subscription plans', description: 'Assign Starter, Professional, or Enterprise plans.' },
      { icon: 'people', title: 'Owner accounts', description: 'Business owners get login access to manage their store.' },
    ],
  },
};

export function emptyPresetProps(key) {
  const preset = EMPTY_PRESETS[key];
  if (!preset) return {};
  return {
    emptyTitle: preset.title,
    emptyMessage: preset.message,
    emptyActionLabel: preset.actionLabel,
    emptyBenefits: preset.benefits,
    emptyIllustration: preset.illustration,
  };
}
