import useBusinessCurrency from '../hooks/useBusinessCurrency';
import useStoreCurrency from '../hooks/useStoreCurrency';

export function BusinessPrice({ amount }) {
  const { formatMoney } = useBusinessCurrency();
  return formatMoney(amount);
}

export function StorePrice({ amount }) {
  const { formatMoney } = useStoreCurrency();
  return formatMoney(amount);
}
