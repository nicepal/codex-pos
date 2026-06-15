import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export default function useBulkDelete({ endpoint, queryKey, onSuccess }) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (ids) => api.post(`${endpoint}/bulk-delete`, { ids }),
    onSuccess: (res) => {
      const keys = Array.isArray(queryKey) ? queryKey : [queryKey];
      keys.forEach((key) => queryClient.invalidateQueries({ queryKey: Array.isArray(key) ? key : [key] }));
      setSelectedIds([]);
      setConfirmOpen(false);
      onSuccess?.(res);
    },
  });

  return {
    selectedIds,
    setSelectedIds,
    confirmOpen,
    setConfirmOpen,
    bulkDelete: () => mutation.mutate(selectedIds),
    isDeleting: mutation.isPending,
    selectionProps: {
      selectable: true,
      selectedIds,
      onSelectionChange: setSelectedIds,
    },
  };
}
