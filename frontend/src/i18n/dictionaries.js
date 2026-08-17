/** Minimal i18n dictionaries for PosHive UI locale switching */
const dictionaries = {
  en: {
    dashboard: 'Dashboard',
    pos: 'POS',
    products: 'Products',
    orders: 'Orders',
    customers: 'Customers',
    settings: 'Settings',
    save: 'Save',
    cancel: 'Cancel',
    search: 'Search',
  },
  es: {
    dashboard: 'Panel',
    pos: 'TPV',
    products: 'Productos',
    orders: 'Pedidos',
    customers: 'Clientes',
    settings: 'Ajustes',
    save: 'Guardar',
    cancel: 'Cancelar',
    search: 'Buscar',
  },
  fr: {
    dashboard: 'Tableau de bord',
    pos: 'Caisse',
    products: 'Produits',
    orders: 'Commandes',
    customers: 'Clients',
    settings: 'Paramètres',
    save: 'Enregistrer',
    cancel: 'Annuler',
    search: 'Rechercher',
  },
  ar: {
    dashboard: 'لوحة التحكم',
    pos: 'نقطة البيع',
    products: 'المنتجات',
    orders: 'الطلبات',
    customers: 'العملاء',
    settings: 'الإعدادات',
    save: 'حفظ',
    cancel: 'إلغاء',
    search: 'بحث',
  },
};

export const SUPPORTED_LOCALES = Object.keys(dictionaries);

export function translate(locale, key) {
  const lang = dictionaries[locale] || dictionaries.en;
  return lang[key] || dictionaries.en[key] || key;
}

export default dictionaries;
