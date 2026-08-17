import { Box, Button, SimpleGrid, Stack, Text, Title, Paper } from '@mantine/core';
import { Add } from '@mui/icons-material';
import {
  LocalOffer, TrendingUp, Groups, Inventory2, SupportAgent,
} from '@mui/icons-material';
import EmptyStateIllustration from './EmptyStateIllustration';
import { CODEX_TOKENS } from '../design-system';

const BENEFIT_ICONS = {
  tag: LocalOffer,
  chart: TrendingUp,
  people: Groups,
  inventory: Inventory2,
  support: SupportAgent,
};

function withAlpha(hex, alpha) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function BenefitItem({ icon, title, description }) {
  const Icon = BENEFIT_ICONS[icon] || LocalOffer;
  const primary = CODEX_TOKENS.primary;

  return (
    <Box
      p={{ base: 'md', md: 'lg' }}
      ta={{ base: 'center', md: 'left' }}
      style={{
        borderTop: '1px solid var(--mantine-color-default-border)',
      }}
    >
      <Box
        w={40}
        h={40}
        mb="sm"
        mx={{ base: 'auto', md: 0 }}
        style={{
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: withAlpha(primary, 0.1),
        }}
      >
        <Icon style={{ fontSize: 20, color: primary }} />
      </Box>
      <Text fw={700} size="sm" mb={4}>
        {title}
      </Text>
      <Text size="sm" c="dimmed" style={{ lineHeight: 1.6 }}>
        {description}
      </Text>
    </Box>
  );
}

export default function EmptyState({
  icon,
  illustration,
  title = 'No data yet',
  message,
  actionLabel,
  actionIcon,
  onAction,
  benefits,
  compact = false,
}) {
  const illusSize = compact ? 72 : 120;

  return (
    <Paper withBorder radius={compact ? 'md' : 'lg'} style={{ overflow: 'hidden' }}>
      <Stack align="center" gap="sm" py={compact ? 'lg' : { base: 40, md: 56 }} px={compact ? 'md' : 'lg'}>
        {icon || <EmptyStateIllustration type={illustration || 'store'} size={illusSize} />}
        <Title order={compact ? 5 : 3} ta="center" fw={700}>
          {title}
        </Title>
        {message ? (
          <Text
            size={compact ? 'sm' : 'md'}
            c="dimmed"
            ta="center"
            maw={compact ? 320 : 440}
            style={{ lineHeight: 1.6 }}
          >
            {message}
          </Text>
        ) : null}
        {actionLabel && onAction ? (
          <Button
            size={compact ? 'sm' : 'md'}
            leftSection={actionIcon || <Add />}
            onClick={onAction}
            mt={compact ? 'xs' : 'sm'}
          >
            {actionLabel}
          </Button>
        ) : null}
      </Stack>

      {benefits?.length > 0 && !compact ? (
        <Box
          style={{
            borderTop: '1px solid var(--mantine-color-default-border)',
            background: withAlpha(CODEX_TOKENS.primary, 0.02),
          }}
        >
          <SimpleGrid cols={{ base: 1, md: benefits.length > 2 ? 3 : benefits.length }} spacing={0}>
            {benefits.map((item) => (
              <BenefitItem key={item.title} {...item} />
            ))}
          </SimpleGrid>
        </Box>
      ) : null}
    </Paper>
  );
}
