import {
  Table,
  Paper,
  Checkbox,
  Center,
  Skeleton,
  Group,
  Text,
  Select,
  Pagination,
  Box,
} from '@mantine/core';
import EmptyState from './EmptyState';
import LoadingState from './LoadingState';

export default function DataTable({
  columns,
  rows,
  loading,
  emptyTitle,
  emptyMessage,
  emptyActionLabel,
  onEmptyAction,
  emptyBenefits,
  emptyIllustration,
  emptyActionIcon,
  onRowClick,
  getRowKey = (row) => row.id,
  stickyHeader = true,
  pagination,
  onPageChange,
  onRowsPerPageChange,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
}) {
  const rowIds = (rows || []).map(getRowKey);
  const allSelected = rowIds.length > 0 && rowIds.every((id) => selectedIds.includes(id));
  const someSelected = rowIds.some((id) => selectedIds.includes(id));

  const toggleAll = () => {
    if (!onSelectionChange) return;
    if (allSelected) {
      onSelectionChange(selectedIds.filter((id) => !rowIds.includes(id)));
    } else {
      onSelectionChange([...new Set([...selectedIds, ...rowIds])]);
    }
  };

  const toggleOne = (id) => {
    if (!onSelectionChange) return;
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((x) => x !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  if (loading && !rows?.length) {
    return (
      <Paper withBorder radius="md" style={{ overflowX: 'auto' }}>
        <Table stickyHeader={stickyHeader} highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              {selectable ? <Table.Th w={40} /> : null}
              {columns.map((col) => (
                <Table.Th key={col.id || col.field}>{col.label}</Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {[1, 2, 3, 4, 5].map((i) => (
              <Table.Tr key={i}>
                {selectable ? (
                  <Table.Td>
                    <Skeleton height={18} width={18} />
                  </Table.Td>
                ) : null}
                {columns.map((col) => (
                  <Table.Td key={col.id || col.field}>
                    <Skeleton height={16} />
                  </Table.Td>
                ))}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>
    );
  }

  if (!loading && !rows?.length) {
    return (
      <EmptyState
        title={emptyTitle}
        message={emptyMessage}
        actionLabel={emptyActionLabel}
        actionIcon={emptyActionIcon}
        onAction={onEmptyAction}
        benefits={emptyBenefits}
        illustration={emptyIllustration}
      />
    );
  }

  const total = pagination?.total || 0;
  const limit = pagination?.limit || 20;
  const page = pagination?.page || 1;
  const totalPages = Math.max(1, Math.ceil(total / limit) || 1);

  return (
    <Paper withBorder radius="md" style={{ overflowX: 'auto' }}>
      <Table stickyHeader={stickyHeader} highlightOnHover verticalSpacing="sm">
        <Table.Thead>
          <Table.Tr>
            {selectable ? (
              <Table.Th w={40}>
                <Checkbox
                  checked={allSelected}
                  indeterminate={someSelected && !allSelected}
                  onChange={toggleAll}
                  aria-label="Select all"
                />
              </Table.Th>
            ) : null}
            {columns.map((col) => (
              <Table.Th
                key={col.id || col.field}
                style={{
                  fontWeight: 600,
                  textAlign: col.align === 'right' ? 'right' : col.align === 'center' ? 'center' : 'left',
                }}
              >
                {col.label}
              </Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((row) => {
            const rowKey = getRowKey(row);
            const isSelected = selectedIds.includes(rowKey);
            return (
              <Table.Tr
                key={rowKey}
                bg={isSelected ? 'var(--mantine-color-codex-light)' : undefined}
                style={{ cursor: onRowClick ? 'pointer' : 'default' }}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {selectable ? (
                  <Table.Td onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onChange={() => toggleOne(rowKey)}
                      aria-label={`Select row ${rowKey}`}
                    />
                  </Table.Td>
                ) : null}
                {columns.map((col) => (
                  <Table.Td
                    key={col.id || col.field}
                    style={{
                      textAlign: col.align === 'right' ? 'right' : col.align === 'center' ? 'center' : 'left',
                    }}
                  >
                    {col.render ? col.render(row) : row[col.field]}
                  </Table.Td>
                ))}
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>

      {loading ? (
        <Center py="md">
          <LoadingState />
        </Center>
      ) : null}

      {pagination ? (
        <Group justify="space-between" px="md" py="sm" wrap="wrap" gap="sm">
          <Group gap="xs">
            <Text size="sm" c="dimmed">
              Rows per page
            </Text>
            <Select
              size="xs"
              w={80}
              allowDeselect={false}
              data={['10', '20', '50', '100']}
              value={String(limit)}
              onChange={(v) => onRowsPerPageChange?.(parseInt(v, 10))}
            />
            <Text size="sm" c="dimmed">
              {total === 0
                ? '0 rows'
                : `${(page - 1) * limit + 1}–${Math.min(page * limit, total)} of ${total}`}
            </Text>
          </Group>
          <Pagination
            size="sm"
            total={totalPages}
            value={page}
            onChange={(p) => onPageChange?.(p)}
          />
        </Group>
      ) : null}
      {!pagination ? <Box h={4} /> : null}
    </Paper>
  );
}
