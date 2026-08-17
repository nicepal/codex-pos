import { Alert, Button, Group, Stack } from '@mantine/core';
import { CodexModal } from '../design-system';

const SIZE_MAP = {
  xs: 'sm',
  sm: 'md',
  md: 'lg',
  lg: 'xl',
  xl: '90%',
};

export default function FormDialog({
  open,
  title,
  onClose,
  onSubmit,
  children,
  submitLabel = 'Save',
  loading = false,
  maxWidth = 'sm',
  error,
  errorAction,
}) {
  return (
    <CodexModal
      opened={!!open}
      onClose={onClose}
      title={title}
      size={SIZE_MAP[maxWidth] || maxWidth || 'md'}
    >
      <form onSubmit={onSubmit}>
        <Stack gap="md">
          {error ? (
            <Alert
              color="red"
              variant="light"
              title={typeof error === 'string' ? undefined : 'Error'}
            >
              <Group justify="space-between" align="center" wrap="wrap" gap="sm">
                <span>{error}</span>
                {errorAction ? (
                  <Button size="compact-xs" variant="subtle" color="red" onClick={errorAction.onClick}>
                    {errorAction.label}
                  </Button>
                ) : null}
              </Group>
            </Alert>
          ) : null}
          {children}
          <Group justify="flex-end" gap="sm" mt="xs">
            <Button variant="default" onClick={onClose} disabled={loading} type="button">
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              {loading ? 'Saving...' : submitLabel}
            </Button>
          </Group>
        </Stack>
      </form>
    </CodexModal>
  );
}
