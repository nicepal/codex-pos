import { Center, Loader, Stack, Text } from '@mantine/core';

export default function LoadingState({ message }) {
  return (
    <Center py={64}>
      <Stack align="center" gap="md">
        <Loader color="codex" />
        {message ? (
          <Text c="dimmed" size="sm">
            {message}
          </Text>
        ) : null}
      </Stack>
    </Center>
  );
}
