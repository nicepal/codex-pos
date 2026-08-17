import { useState } from 'react';
import {
  Alert, Badge, Box, Button, Group, NativeSelect, TextInput, Tabs,
} from '@mantine/core';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Add, CheckCircle } from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';
import FeatureGate from '../../components/FeatureGate';
import DataTable from '../../components/DataTable';
import FormDialog from '../../components/FormDialog';
import RHFTextField from '../../components/RHFTextField';
import { formatDisplayText } from '../../utils/displayText';

export default function ManufacturingPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('boms');
  const [bomOpen, setBomOpen] = useState(false);
  const [orderOpen, setOrderOpen] = useState(false);
  const [error, setError] = useState('');
  const [productId, setProductId] = useState('');
  const [components, setComponents] = useState([{ product_id: '', quantity: 1 }]);
  const bomForm = useForm({ defaultValues: { name: '', output_qty: 1 } });
  const orderForm = useForm({ defaultValues: { bom_id: '', quantity: 1, branch_id: '' } });

  const { data: boms, isLoading: bomsLoading } = useQuery({
    queryKey: ['manufacturing-boms'],
    queryFn: () => api.get('/manufacturing/boms', { params: { limit: 50 } }).then((r) => r.data.data),
  });

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ['manufacturing-orders'],
    queryFn: () => api.get('/manufacturing/production-orders', { params: { limit: 50 } }).then((r) => r.data.data),
    enabled: tab === 'orders',
  });

  const { data: products } = useQuery({
    queryKey: ['products-mfg'],
    queryFn: () => api.get('/products', { params: { limit: 200, status: 'active' } }).then((r) => r.data.data),
    enabled: bomOpen || orderOpen,
  });

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: () => api.get('/branches', { params: { limit: 50 } }).then((r) => r.data.data),
    enabled: orderOpen,
  });

  const createBom = useMutation({
    mutationFn: (payload) => api.post('/manufacturing/boms', payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['manufacturing-boms']);
      setBomOpen(false);
      bomForm.reset();
      setProductId('');
      setComponents([{ product_id: '', quantity: 1 }]);
    },
    onError: (err) => setError(err.response?.data?.message || 'Failed to create BOM'),
  });

  const createOrder = useMutation({
    mutationFn: (payload) => api.post('/manufacturing/production-orders', payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['manufacturing-orders']);
      setOrderOpen(false);
      orderForm.reset();
    },
    onError: (err) => setError(err.response?.data?.message || 'Failed to create production order'),
  });

  const completeOrder = useMutation({
    mutationFn: (id) => api.post(`/manufacturing/production-orders/${id}/complete`),
    onSuccess: () => queryClient.invalidateQueries(['manufacturing-orders']),
    onError: (err) => setError(err.response?.data?.message || 'Failed to complete order'),
  });

  const submitBom = bomForm.handleSubmit((values) => {
    if (!productId) {
      setError('Select a finished product');
      return;
    }
    const items = components
      .filter((c) => c.product_id)
      .map((c) => ({ component_product_id: c.product_id, quantity: parseFloat(c.quantity) || 1 }));
    if (!items.length) {
      setError('Add at least one component');
      return;
    }
    createBom.mutate({
      name: values.name,
      product_id: productId,
      output_qty: parseInt(values.output_qty, 10) || 1,
      items,
    });
  });

  const productOptions = [
    { value: '', label: 'Select product' },
    ...(products || []).map((p) => ({ value: String(p.id), label: p.name })),
  ];

  return (
    <FeatureGate pack="mfg_pro">
      <Box>
        <PageHeader title="Manufacturing" subtitle="Bills of materials and production orders" />
        {error ? (
          <Alert color="red" mb="md" withCloseButton onClose={() => setError('')}>
            {error}
          </Alert>
        ) : null}

        <Tabs value={tab} onChange={setTab} mb="md">
          <Tabs.List>
            <Tabs.Tab value="boms">BOMs</Tabs.Tab>
            <Tabs.Tab value="orders">Production orders</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="boms" pt="md">
            <Button
              leftSection={<Add />}
              mb="md"
              onClick={() => {
                setError('');
                setBomOpen(true);
              }}
            >
              New BOM
            </Button>
            <DataTable
              columns={[
                { field: 'name', label: 'Name' },
                { field: 'product_name', label: 'Product', render: (r) => r.product_name || r.product_id },
                { field: 'output_qty', label: 'Output qty' },
                {
                  field: 'created_at',
                  label: 'Created',
                  render: (r) => (r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'),
                },
              ]}
              rows={boms || []}
              loading={bomsLoading}
              emptyTitle="No BOMs"
              emptyMessage="Define a bill of materials for assembled or manufactured products."
            />
          </Tabs.Panel>

          <Tabs.Panel value="orders" pt="md">
            <Button
              leftSection={<Add />}
              mb="md"
              onClick={() => {
                setError('');
                setOrderOpen(true);
              }}
            >
              New production order
            </Button>
            <DataTable
              columns={[
                { field: 'id', label: 'Order', render: (r) => (r.id || '').slice(0, 8) },
                { field: 'bom_name', label: 'BOM', render: (r) => r.bom_name || r.bom_id },
                { field: 'quantity', label: 'Qty' },
                {
                  field: 'status',
                  label: 'Status',
                  render: (r) => (
                    <Badge size="sm" color={r.status === 'completed' ? 'green' : 'gray'}>
                      {formatDisplayText(r.status)}
                    </Badge>
                  ),
                },
                {
                  field: 'actions',
                  label: '',
                  render: (r) =>
                    (r.status !== 'completed' ? (
                      <Button
                        size="compact-sm"
                        leftSection={<CheckCircle fontSize="small" />}
                        loading={completeOrder.isPending}
                        onClick={(e) => {
                          e.stopPropagation();
                          completeOrder.mutate(r.id);
                        }}
                      >
                        Complete
                      </Button>
                    ) : null),
                },
              ]}
              rows={orders || []}
              loading={ordersLoading}
              emptyTitle="No production orders"
              emptyMessage="Create a production order to consume components and stock finished goods."
            />
          </Tabs.Panel>
        </Tabs>

        <FormDialog
          open={bomOpen}
          title="New BOM"
          onClose={() => setBomOpen(false)}
          onSubmit={submitBom}
          loading={createBom.isPending}
          submitLabel="Create"
        >
          <RHFTextField register={bomForm.register} name="name" rules={{ required: true }} label="BOM name" />
          <NativeSelect
            label="Finished product"
            w="100%"
            value={productId}
            onChange={(e) => setProductId(e.currentTarget.value)}
            data={productOptions}
          />
          <RHFTextField register={bomForm.register} name="output_qty" label="Output qty" type="number" />
          {components.map((c, idx) => (
            <Group key={idx} align="flex-end" grow wrap="wrap">
              <NativeSelect
                label="Component"
                style={{ flex: 1, minWidth: 180 }}
                value={c.product_id}
                onChange={(e) => {
                  const next = [...components];
                  next[idx] = { ...next[idx], product_id: e.currentTarget.value };
                  setComponents(next);
                }}
                data={productOptions}
              />
              <TextInput
                label="Qty"
                type="number"
                w={100}
                value={c.quantity}
                onChange={(e) => {
                  const next = [...components];
                  next[idx] = { ...next[idx], quantity: e.currentTarget.value };
                  setComponents(next);
                }}
              />
            </Group>
          ))}
          <Button
            size="sm"
            variant="default"
            onClick={() => setComponents([...components, { product_id: '', quantity: 1 }])}
          >
            Add component
          </Button>
        </FormDialog>

        <FormDialog
          open={orderOpen}
          title="New production order"
          onClose={() => setOrderOpen(false)}
          onSubmit={orderForm.handleSubmit((v) =>
            createOrder.mutate({
              bom_id: v.bom_id,
              quantity: parseInt(v.quantity, 10) || 1,
              branch_id: v.branch_id || null,
            }),
          )}
          loading={createOrder.isPending}
          submitLabel="Create"
        >
          <NativeSelect
            label="BOM"
            w="100%"
            {...orderForm.register('bom_id', { required: true })}
            data={[
              { value: '', label: 'Select BOM' },
              ...(boms || []).map((b) => ({ value: String(b.id), label: b.name })),
            ]}
          />
          <RHFTextField register={orderForm.register} name="quantity" label="Quantity" type="number" />
          <NativeSelect
            label="Branch"
            w="100%"
            {...orderForm.register('branch_id')}
            data={[
              { value: '', label: 'Default' },
              ...(branches || []).map((b) => ({ value: String(b.id), label: b.name })),
            ]}
          />
        </FormDialog>
      </Box>
    </FeatureGate>
  );
}
