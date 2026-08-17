import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Stack, Text, Group, Box, SegmentedControl, Divider } from '@mantine/core';
import { Receipt, AddShoppingCart, Print, Close } from '@mui/icons-material';
import { CodexModal, CodexButton } from '../../design-system';
import api from '../../services/api';
import useBusinessCurrency from '../../hooks/useBusinessCurrency';
import SaleReceipt from './SaleReceipt';
import './SaleReceipt.print.css';

function printHtml(html) {
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => {
    w.print();
  }, 250);
}

function printReceiptNode(node, width) {
  if (!node) return;
  const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map((el) => el.outerHTML)
    .join('\n');
  const widthClass = width === '58' ? 'receipt--58' : 'receipt--80';
  const clone = node.cloneNode(true);
  clone.classList.remove('receipt--58', 'receipt--80');
  clone.classList.add(widthClass);
  printHtml(`<!DOCTYPE html><html><head><meta charset="utf-8"/>${styles}
<style>
  body { margin: 0; padding: 8px; background: #fff; }
  @media print { body { padding: 0; } }
</style>
</head><body>${clone.outerHTML}</body></html>`);
}

export default function SaleSuccessDialog({
  orderId,
  open,
  onClose,
  onNewSale,
  cashTendered,
  changeAmount,
  offline = false,
  offlineLocalId = null,
  offlineReceiptData = null,
}) {
  const { formatMoney } = useBusinessCurrency();
  const receiptRef = useRef(null);
  const offlineReceiptRef = useRef(null);
  const [width, setWidth] = useState('80');
  const [printing, setPrinting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['receipt', orderId],
    queryFn: () => api.get(`/orders/${orderId}/receipt`).then((r) => r.data.data),
    enabled: !!orderId && open && !offline,
  });

  const print = async () => {
    if (offline) {
      printReceiptNode(offlineReceiptRef.current, width);
      return;
    }
    if (!data) return;
    setPrinting(true);
    try {
      try {
        const res = await api.post('/print/receipts', { order_id: orderId, width });
        const payload = res.data?.data;
        if (payload?.html) {
          printHtml(payload.html);
          return;
        }
        if (payload?.payload?.html) {
          printHtml(payload.payload.html);
          return;
        }
      } catch {
        // Fall through to local DOM print
      }
      printReceiptNode(receiptRef.current, width);
    } finally {
      setPrinting(false);
    }
  };

  const handleNewSale = () => {
    onNewSale?.();
    onClose();
  };

  return (
    <CodexModal
      opened={open}
      onClose={handleNewSale}
      size="md"
      title={
        <Group gap="xs" className="no-print">
          <Receipt style={{ color: offline ? 'var(--mantine-color-yellow-6)' : 'var(--mantine-color-teal-6)' }} />
          <span>{offline ? 'Sale saved offline' : 'Sale complete'}</span>
        </Group>
      }
    >
      <Stack gap="md">
        {offline ? (
          <>
            <Box>
              <Text fw={700} mb={4}>OFFLINE / PENDING SYNC</Text>
              <Text size="sm" c="dimmed" mb="xs">
                This sale is stored on this device only. Print a temporary summary below;
                after sync succeeds, reprint the official receipt from Receipt history.
              </Text>
              {offlineLocalId && (
                <Text size="xs" c="dimmed">
                  Local ID: {offlineLocalId}
                </Text>
              )}
            </Box>
            {offlineReceiptData ? (
              <>
                <Group justify="center" className="no-print">
                  <SegmentedControl
                    size="sm"
                    value={width}
                    onChange={setWidth}
                    data={[
                      { label: '58 mm', value: '58' },
                      { label: '80 mm', value: '80' },
                    ]}
                    aria-label="Receipt width"
                  />
                </Group>
                <div className="sale-receipt-preview">
                  <div ref={offlineReceiptRef}>
                    <SaleReceipt
                      data={offlineReceiptData}
                      formatMoney={formatMoney}
                      width={width}
                      cashTendered={cashTendered}
                      changeAmount={changeAmount}
                    />
                  </div>
                </div>
              </>
            ) : (
              cashTendered != null && (
                <Text size="sm">
                  Tendered {formatMoney(cashTendered)}
                  {changeAmount != null ? ` · Change ${formatMoney(changeAmount)}` : ''}
                </Text>
              )
            )}
          </>
        ) : isLoading || !data ? (
          <Text c="dimmed" ta="center" py="xl">
            Loading receipt…
          </Text>
        ) : (
          <>
            <Group justify="center" className="no-print">
              <SegmentedControl
                size="sm"
                value={width}
                onChange={setWidth}
                data={[
                  { label: '58 mm', value: '58' },
                  { label: '80 mm', value: '80' },
                ]}
                aria-label="Receipt width"
              />
            </Group>
            <div className="sale-receipt-preview">
              <div ref={receiptRef}>
                <SaleReceipt
                  data={data}
                  formatMoney={formatMoney}
                  width={width}
                  cashTendered={cashTendered}
                  changeAmount={changeAmount}
                />
              </div>
            </div>
          </>
        )}

        <Divider className="no-print" />

        <Stack gap="sm" className="sale-receipt-actions no-print">
          {(offline ? offlineReceiptData : data) && (
            <CodexButton
              fullWidth
              variant="outline"
              leftSection={<Print fontSize="small" />}
              onClick={print}
              disabled={(!offline && !data) || printing}
              touch
            >
              {printing ? 'Printing…' : offline ? 'Print offline summary' : 'Print receipt'}
            </CodexButton>
          )}
          <CodexButton
            fullWidth
            color="codex"
            leftSection={<AddShoppingCart fontSize="small" />}
            onClick={handleNewSale}
            touch
            style={{ minHeight: 52 }}
          >
            New sale
          </CodexButton>
          <CodexButton
            fullWidth
            variant="default"
            leftSection={<Close fontSize="small" />}
            onClick={onClose}
            touch
          >
            Close
          </CodexButton>
        </Stack>
      </Stack>
    </CodexModal>
  );
}
