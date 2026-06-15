import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Skeleton, Box,
  TablePagination, Checkbox,
} from '@mui/material';
import EmptyState from './EmptyState';
import LoadingState from './LoadingState';

export default function DataTable({
  columns, rows, loading, emptyTitle, emptyMessage, emptyActionLabel, onEmptyAction,
  emptyBenefits, emptyIllustration, emptyActionIcon,
  onRowClick, getRowKey = (row) => row.id, stickyHeader = true,
  pagination, onPageChange, onRowsPerPageChange,
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
      <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
        <Table stickyHeader={stickyHeader}>
          <TableHead>
            <TableRow>
              {selectable && <TableCell padding="checkbox" />}
              {columns.map((col) => (
                <TableCell key={col.id || col.field}>{col.label}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {[1, 2, 3, 4, 5].map((i) => (
              <TableRow key={i}>
                {selectable && <TableCell padding="checkbox"><Skeleton width={24} /></TableCell>}
                {columns.map((col) => (
                  <TableCell key={col.id || col.field}><Skeleton /></TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
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

  return (
    <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
      <Table stickyHeader={stickyHeader}>
        <TableHead>
          <TableRow>
            {selectable && (
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={someSelected && !allSelected}
                  checked={allSelected}
                  onChange={toggleAll}
                />
              </TableCell>
            )}
            {columns.map((col) => (
              <TableCell key={col.id || col.field} align={col.align || 'left'} sx={{ fontWeight: 600 }}>
                {col.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => {
            const rowKey = getRowKey(row);
            const isSelected = selectedIds.includes(rowKey);
            return (
              <TableRow
                key={rowKey}
                hover={!!onRowClick}
                selected={isSelected}
                sx={{ cursor: onRowClick ? 'pointer' : 'default' }}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {selectable && (
                  <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={isSelected} onChange={() => toggleOne(rowKey)} />
                  </TableCell>
                )}
                {columns.map((col) => (
                  <TableCell key={col.id || col.field} align={col.align || 'left'}>
                    {col.render ? col.render(row) : row[col.field]}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <LoadingState />
        </Box>
      )}
      {pagination && (
        <TablePagination
          component="div"
          count={pagination.total || 0}
          page={Math.max(0, (pagination.page || 1) - 1)}
          onPageChange={(_, p) => onPageChange?.(p + 1)}
          rowsPerPage={pagination.limit || 20}
          onRowsPerPageChange={(e) => onRowsPerPageChange?.(parseInt(e.target.value, 10))}
          rowsPerPageOptions={[10, 20, 50, 100]}
        />
      )}
    </TableContainer>
  );
}
