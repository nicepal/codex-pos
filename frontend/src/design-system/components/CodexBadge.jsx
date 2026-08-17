import { Badge } from '@mantine/core';

/** Compact status badge (online, stock, register). */
export default function CodexBadge({ children, ...props }) {
  return (
    <Badge variant="light" size="md" {...props}>
      {children}
    </Badge>
  );
}
