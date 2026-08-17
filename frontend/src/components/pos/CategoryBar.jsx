import { Stack, Group, ScrollArea, Button } from '@mantine/core';

export default function CategoryBar({ categories = [], categoryId, onChange, quickKeys = [], onQuickKey }) {
  return (
    <Stack gap="sm" w="100%">
      <ScrollArea type="hover" offsetScrollbars scrollbarSize={4}>
        <Group gap="xs" wrap="nowrap" pb={4}>
          <Button
            size="sm"
            variant={!categoryId ? 'filled' : 'outline'}
            color="codex"
            onClick={() => onChange('')}
            styles={{ root: { minHeight: 40, flexShrink: 0, fontWeight: 600 } }}
          >
            All
          </Button>
          {(categories || []).map((c) => (
            <Button
              key={c.id}
              size="sm"
              variant={categoryId === c.id ? 'filled' : 'outline'}
              color="codex"
              onClick={() => onChange(c.id)}
              styles={{ root: { minHeight: 40, flexShrink: 0 } }}
            >
              {c.name}
            </Button>
          ))}
        </Group>
      </ScrollArea>
      {quickKeys.length > 0 && (
        <ScrollArea type="hover" offsetScrollbars scrollbarSize={4}>
          <Group gap="xs" wrap="nowrap" pb={4}>
            {quickKeys.map((key) => (
              <Button
                key={key.product_id || key.id}
                size="sm"
                variant="outline"
                color="violet"
                onClick={() => onQuickKey?.(key)}
                styles={{ root: { minHeight: 40, flexShrink: 0 } }}
              >
                {key.name || key.label}
              </Button>
            ))}
          </Group>
        </ScrollArea>
      )}
    </Stack>
  );
}