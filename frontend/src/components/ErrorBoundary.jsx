import { Component } from 'react';
import { Box, Button, Paper, Stack, Text, Title } from '@mantine/core';

/**
 * Catches render errors so navigation / browser Back never leaves a blank white screen.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('UI error boundary', error, info?.componentStack);
  }

  componentDidUpdate(prevProps) {
    // Clear error when the route (or resetKey) changes so Back can recover.
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <Box maw={520} mx="auto" mt="xl" px="md">
          <Paper withBorder p="lg" radius="md">
            <Stack gap="sm">
              <Title order={4}>Something went wrong</Title>
              <Text c="dimmed" size="sm">
                This page failed to load. Try again, or go back to the dashboard.
              </Text>
              <Stack gap="xs" mt="xs">
                <Button onClick={() => this.setState({ error: null })}>
                  Try again
                </Button>
                <Button
                  variant="light"
                  component="a"
                  href="/dashboard"
                >
                  Go to dashboard
                </Button>
              </Stack>
            </Stack>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}
