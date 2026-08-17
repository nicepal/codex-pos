import { Group, Button, Text, Paper } from '@mantine/core';
import { Delete } from '@mui/icons-material';

export default function BulkDeleteToolbar({
  count,
  onClear,
  onDelete,
  label = 'selected',
  deleteLabel = 'Delete selected',
}) {
  if (!count) return null;

  return (
    <Paper
      withBorder
      radius="md"
      px="md"
      py="sm"
      mb="md"
      style={{ background: 'var(--mantine-color-default-hover)' }}
    >
      <Group gap="md">
        <Text size="sm" fw={600}>
          {count} {label}
        </Text>
        <Button size="compact-sm" variant="subtle" onClick={onClear}>
          Clear
        </Button>
        <Button
          size="compact-sm"
          color="red"
          leftSection={<Delete fontSize="small" />}
          onClick={onDelete}
        >
          {deleteLabel}
        </Button>
      </Group>
    </Paper>
  );
}
