import BulkDeleteToolbar from './BulkDeleteToolbar';
import ConfirmDialog from './ConfirmDialog';

export default function BulkDeleteActions({
  selectedIds,
  setSelectedIds,
  confirmOpen,
  setConfirmOpen,
  onConfirm,
  isDeleting,
  title = 'Delete selected items',
  message,
  label = 'selected',
  deleteLabel = 'Delete selected',
  confirmLabel = 'Delete',
}) {
  const count = selectedIds.length;
  const defaultMessage = `Are you sure you want to delete ${count} item${count === 1 ? '' : 's'}? This cannot be undone.`;

  return (
    <>
      <BulkDeleteToolbar
        count={count}
        onClear={() => setSelectedIds([])}
        onDelete={() => setConfirmOpen(true)}
        label={label}
        deleteLabel={deleteLabel}
      />
      <ConfirmDialog
        open={confirmOpen}
        title={title}
        message={message || defaultMessage}
        onConfirm={onConfirm}
        onCancel={() => setConfirmOpen(false)}
        loading={isDeleting}
        danger
        confirmLabel={confirmLabel}
      />
    </>
  );
}
