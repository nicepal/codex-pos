import { useState, useEffect } from 'react';
import {
  Stack, Text, Group, Alert, Checkbox, Radio, Divider, Center, Loader, Box,
} from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { CodexModal, CodexButton, CodexInput } from '../../design-system';
import api from '../../services/api';

function GroupSelector({ group, selected, onChange, formatMoney }) {
  const isMulti = group.max_selections > 1;
  const selectedIds = selected[group.id] || [];

  const toggle = (optionId) => {
    if (isMulti) {
      const next = selectedIds.includes(optionId)
        ? selectedIds.filter((id) => id !== optionId)
        : [...selectedIds, optionId];
      if (next.length > group.max_selections) return;
      onChange(group.id, next);
    } else {
      onChange(group.id, [optionId]);
    }
  };

  return (
    <Box mb="md">
      <Text fw={600} size="sm" mb={4}>
        {group.name}
        {(group.required || group.min_selections > 0) ? ' *' : ''}
        <Text span size="xs" c="dimmed" ml={6}>
          ({group.min_selections}–{group.max_selections} selections)
        </Text>
      </Text>
      <Stack gap={4}>
        {group.options.map((opt) => {
          const checked = selectedIds.includes(opt.id);
          const priceLabel = parseFloat(opt.price_delta) > 0
            ? ` (+${formatMoney(opt.price_delta)})`
            : '';
          if (isMulti) {
            return (
              <Checkbox
                key={opt.id}
                checked={checked}
                onChange={() => toggle(opt.id)}
                label={`${opt.name}${priceLabel}`}
                styles={{ root: { minHeight: 40 } }}
              />
            );
          }
          return (
            <Radio
              key={opt.id}
              checked={checked}
              onChange={() => toggle(opt.id)}
              label={`${opt.name}${priceLabel}`}
              styles={{ root: { minHeight: 40 } }}
            />
          );
        })}
      </Stack>
    </Box>
  );
}

export default function ModifierPickerDialog({
  open,
  product,
  onClose,
  onConfirm,
  formatMoney,
}) {
  const [selected, setSelected] = useState({});
  const [notes, setNotes] = useState('');
  const [validationError, setValidationError] = useState('');

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['product-modifiers', product?.id],
    queryFn: () => api.get(`/modifiers/products/${product.id}`).then((r) => r.data.data),
    enabled: open && !!product?.id,
  });

  useEffect(() => {
    if (open) {
      setSelected({});
      setNotes('');
      setValidationError('');
    }
  }, [open, product?.id]);

  const handleGroupChange = (groupId, optionIds) => {
    setSelected((prev) => ({ ...prev, [groupId]: optionIds }));
    setValidationError('');
  };

  const validate = () => {
    for (const group of groups) {
      const count = (selected[group.id] || []).length;
      if ((group.required || group.min_selections > 0) && count < Math.max(group.min_selections, group.required ? 1 : 0)) {
        setValidationError(`Please select options for "${group.name}"`);
        return false;
      }
      if (count > group.max_selections) {
        setValidationError(`Too many selections for "${group.name}"`);
        return false;
      }
    }
    return true;
  };

  const computeUnitPrice = () => {
    let base = parseFloat(product?.sale_price || 0);
    for (const group of groups) {
      for (const optId of selected[group.id] || []) {
        const opt = group.options.find((o) => o.id === optId);
        if (opt) base += parseFloat(opt.price_delta || 0);
      }
    }
    return base;
  };

  const handleConfirm = () => {
    if (!validate()) return;
    const optionIds = groups.flatMap((g) => selected[g.id] || []);
    const modifierLabels = groups.flatMap((g) => (selected[g.id] || []).map((id) => {
      const opt = g.options.find((o) => o.id === id);
      return opt ? `${g.name}: ${opt.name}` : null;
    })).filter(Boolean);

    onConfirm({
      product_id: product.id,
      product_name: modifierLabels.length
        ? `${product.name} (${modifierLabels.join(', ')})`
        : product.name,
      sku: product.sku,
      unit_price: computeUnitPrice(),
      sale_price: parseFloat(product.sale_price),
      category_id: product.category_id || null,
      tax_rule_id: product.tax_rule_id || null,
      selected_modifiers: optionIds,
      item_notes: notes.trim() || undefined,
      modifier_details: groups.flatMap((g) => (selected[g.id] || []).map((id) => {
        const opt = g.options.find((o) => o.id === id);
        return opt ? { group_id: g.id, group_name: g.name, option_id: id, option_name: opt.name, price_delta: parseFloat(opt.price_delta) } : null;
      }).filter(Boolean)),
    });
    onClose();
  };

  return (
    <CodexModal
      opened={open}
      onClose={onClose}
      size="md"
      title={`${product?.name || ''} — modifiers`}
    >
      <Stack gap="md">
        {validationError ? <Alert color="red">{validationError}</Alert> : null}
        {isLoading ? (
          <Center py="xl"><Loader size="sm" /></Center>
        ) : (
          <>
            {groups.map((group) => (
              <GroupSelector
                key={group.id}
                group={group}
                selected={selected}
                onChange={handleGroupChange}
                formatMoney={formatMoney}
              />
            ))}
            {!groups.length ? (
              <Text c="dimmed">No modifiers configured for this product.</Text>
            ) : null}
            <CodexInput
              label="Item notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            {groups.length ? (
              <Text fw={700} size="sm">
                Unit price: {formatMoney(computeUnitPrice())}
              </Text>
            ) : null}
          </>
        )}

        <Divider />

        <Group justify="flex-end" gap="sm">
          <CodexButton variant="default" onClick={onClose} touch>
            Cancel
          </CodexButton>
          <CodexButton color="codex" onClick={handleConfirm} disabled={isLoading} touch>
            Add to cart
          </CodexButton>
        </Group>
      </Stack>
    </CodexModal>
  );
}
