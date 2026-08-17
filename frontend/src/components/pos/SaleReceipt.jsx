import './SaleReceipt.print.css';

function nonzero(val) {
  return Number(val) > 0;
}

function cashierName(user) {
  if (!user) return null;
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  return name || user.email || null;
}

function splitProductName(item) {
  const name = item?.product_name || '';
  if (item?.variant_id && name.includes(' - ')) {
    const idx = name.indexOf(' - ');
    return { title: name.slice(0, idx), variant: name.slice(idx + 3) };
  }
  return { title: name, variant: null };
}

function paymentLabel(method) {
  if (!method) return null;
  const map = {
    cash: 'Cash',
    card: 'Card',
    bank: 'Bank',
    gift_card: 'Gift card',
    other: 'Other',
    split: 'Split',
  };
  return map[method] || String(method);
}

function formatDate(value) {
  if (!value) return null;
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

/**
 * Presentation-only sale receipt. Displays backend values; does not recalculate totals.
 */
export default function SaleReceipt({
  data,
  formatMoney,
  width = '80',
  cashTendered,
  changeAmount,
  className = '',
}) {
  if (!data?.order) return null;

  const { business, branch, order, items = [], payments = [], footer } = data;
  const isRefund = order.status === 'refunded';
  const title = isRefund ? 'REFUND' : 'SALE';
  const cashier = cashierName(order.created_by_user);
  const customer = order.customer;
  const when = formatDate(order.created_at || data.printed_at);
  const contactLines = [
    branch?.address || business?.address,
    branch?.phone || business?.phone,
  ].filter(Boolean);

  const widthClass = width === '58' ? 'receipt--58' : 'receipt--80';

  return (
    <article className={`sale-receipt print-receipt ${widthClass} ${className}`.trim()}>
      <header className="sale-receipt__header">
        {business?.logo_url ? (
          <img className="sale-receipt__logo" src={business.logo_url} alt="" />
        ) : null}
        {business?.name ? <h1 className="sale-receipt__biz">{business.name}</h1> : null}
        {branch?.name ? <p className="sale-receipt__branch">{branch.name}</p> : null}
        {contactLines.map((line) => (
          <p key={line} className="sale-receipt__contact">{line}</p>
        ))}
      </header>

      <div className="sale-receipt__rule" />

      <p className="sale-receipt__title">{title}</p>

      <section className="sale-receipt__meta">
        {order.order_number ? (
          <div className="sale-receipt__row">
            <span>Order</span>
            <span>{order.order_number}</span>
          </div>
        ) : null}
        {when ? (
          <div className="sale-receipt__row">
            <span>Date</span>
            <span>{when}</span>
          </div>
        ) : null}
        {cashier ? (
          <div className="sale-receipt__row">
            <span>Cashier</span>
            <span>{cashier}</span>
          </div>
        ) : null}
        {branch?.name ? (
          <div className="sale-receipt__row">
            <span>Branch</span>
            <span>{branch.name}</span>
          </div>
        ) : null}
        {order.table_name ? (
          <div className="sale-receipt__row">
            <span>Table</span>
            <span>{order.table_name}</span>
          </div>
        ) : null}
        {order.guest_count ? (
          <div className="sale-receipt__row">
            <span>Guests</span>
            <span>{order.guest_count}</span>
          </div>
        ) : null}
        {order.server_name ? (
          <div className="sale-receipt__row">
            <span>Server</span>
            <span>{order.server_name}</span>
          </div>
        ) : null}
      </section>

      <div className="sale-receipt__rule" />

      <section className="sale-receipt__items">
        {items.map((item) => {
          const { title: productTitle, variant } = splitProductName(item);
          return (
            <div key={item.id || `${item.product_name}-${item.quantity}`} className="sale-receipt__item">
              <div className="sale-receipt__item-main">
                <div className="sale-receipt__item-name">{productTitle}</div>
                {variant ? <div className="sale-receipt__item-variant">{variant}</div> : null}
                <div className="sale-receipt__item-qty">
                  {item.quantity} × {formatMoney(item.unit_price)}
                </div>
              </div>
              <div className="sale-receipt__item-total">{formatMoney(item.total)}</div>
            </div>
          );
        })}
      </section>

      <div className="sale-receipt__rule" />

      <section className="sale-receipt__summary">
        {order.subtotal != null ? (
          <div className="sale-receipt__row">
            <span>Subtotal</span>
            <span>{formatMoney(order.subtotal)}</span>
          </div>
        ) : null}
        {nonzero(order.discount_amount) ? (
          <div className="sale-receipt__row">
            <span>Discount</span>
            <span>-{formatMoney(order.discount_amount)}</span>
          </div>
        ) : null}
        {nonzero(order.tax_amount) ? (
          <div className="sale-receipt__row">
            <span>Tax</span>
            <span>{formatMoney(order.tax_amount)}</span>
          </div>
        ) : null}
        {nonzero(order.tip_amount) ? (
          <div className="sale-receipt__row">
            <span>Tip</span>
            <span>{formatMoney(order.tip_amount)}</span>
          </div>
        ) : null}
        <div className="sale-receipt__row sale-receipt__total">
          <span>TOTAL</span>
          <span>{formatMoney(order.total_amount)}</span>
        </div>
      </section>

      {(payments.length > 0 || order.payment_method || cashTendered != null || changeAmount != null) ? (
        <>
          <div className="sale-receipt__rule" />
          <section className="sale-receipt__payment">
            {payments.length > 1
              ? payments.map((p) => (
                <div key={p.id || `${p.payment_method}-${p.amount}`} className="sale-receipt__row">
                  <span>{paymentLabel(p.payment_method)}</span>
                  <span>{formatMoney(p.amount)}</span>
                </div>
              ))
              : null}
            {payments.length === 1 ? (
              <div className="sale-receipt__row">
                <span>{paymentLabel(payments[0].payment_method)}</span>
                <span>{formatMoney(payments[0].amount)}</span>
              </div>
            ) : null}
            {!payments.length && order.payment_method ? (
              <div className="sale-receipt__row">
                <span>{paymentLabel(order.payment_method)}</span>
                <span>{formatMoney(order.total_amount)}</span>
              </div>
            ) : null}
            {cashTendered != null && Number.isFinite(Number(cashTendered)) ? (
              <div className="sale-receipt__row">
                <span>Tendered</span>
                <span>{formatMoney(cashTendered)}</span>
              </div>
            ) : null}
            {changeAmount != null && Number.isFinite(Number(changeAmount)) ? (
              <div className="sale-receipt__row">
                <span>Change</span>
                <span>{formatMoney(changeAmount)}</span>
              </div>
            ) : null}
          </section>
        </>
      ) : null}

      {customer && (customer.name || customer.phone || customer.email) ? (
        <>
          <div className="sale-receipt__rule" />
          <section className="sale-receipt__customer">
            <div className="sale-receipt__customer-label">Customer</div>
            {customer.name ? <div>{customer.name}</div> : null}
            {customer.phone ? <div className="sale-receipt__contact">{customer.phone}</div> : null}
            {customer.email ? <div className="sale-receipt__contact">{customer.email}</div> : null}
          </section>
        </>
      ) : null}

      <footer className="sale-receipt__footer">
        <p>{footer || 'Thank you for your purchase!'}</p>
        <p className="sale-receipt__powered">Powered by CodexPOS</p>
      </footer>
    </article>
  );
}
