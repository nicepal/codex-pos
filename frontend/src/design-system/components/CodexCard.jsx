import { Card } from '@mantine/core';

/** Bordered surface card for POS tiles and panels. */
export default function CodexCard({ children, interactive = false, style, ...props }) {
  return (
    <Card
      padding="sm"
      {...props}
      style={{
        transition: interactive ? 'border-color 0.15s, box-shadow 0.15s, transform 0.12s' : undefined,
        cursor: interactive ? 'pointer' : undefined,
        ...style,
      }}
    >
      {children}
    </Card>
  );
}
