import { useState } from 'react';
import {
  AppShell,
  Avatar,
  Burger,
  Divider,
  Group,
  Menu,
  NavLink,
  ScrollArea,
  Text,
  UnstyledButton,
  ActionIcon,
  Collapse,
  Box,
  Stack,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import {
  Logout,
  ExpandLess,
  ExpandMore,
  Brightness4,
  Brightness7,
} from '@mui/icons-material';
import { useColorMode } from '../AppThemeProvider';

const DRAWER_WIDTH = 260;

export default function ResponsiveDrawer({
  title,
  subtitle,
  navGroups,
  user,
  onLogout,
  children,
  headerExtra,
}) {
  const { mode, toggleColorMode } = useColorMode();
  const isMobile = useMediaQuery('(max-width: 48em)');
  const [mobileOpened, setMobileOpened] = useState(false);
  const [expanded, setExpanded] = useState(() => {
    const init = {};
    navGroups.forEach((g) => {
      init[g.label] = true;
    });
    return init;
  });

  const toggleGroup = (label) => {
    setExpanded((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const handleNavClick = (item) => {
    item.onClick();
    if (isMobile) setMobileOpened(false);
  };

  const drawerContent = (
    <Stack gap={0} h="100%">
      <Box px="md" pt="md" pb="sm">
        <Text fw={700} c="codex" size="lg">
          {title}
        </Text>
        {subtitle ? (
          <Text size="xs" c="dimmed" mt={2}>
            {subtitle}
          </Text>
        ) : null}
      </Box>
      <Divider />
      <ScrollArea flex={1} type="scroll" offsetScrollbars>
        <Box py="xs">
          {navGroups.map((group) => (
            <Box key={group.label} mb={4}>
              {group.collapsible !== false ? (
                <>
                  <UnstyledButton
                    onClick={() => toggleGroup(group.label)}
                    w="100%"
                    px="md"
                    py={6}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                  >
                    <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                      {group.label}
                    </Text>
                    {expanded[group.label] ? (
                      <ExpandLess fontSize="small" />
                    ) : (
                      <ExpandMore fontSize="small" />
                    )}
                  </UnstyledButton>
                  <Collapse in={expanded[group.label]}>
                    {group.items.map((item) => (
                      <NavLink
                        key={item.path}
                        label={item.label}
                        leftSection={item.icon}
                        active={item.selected}
                        onClick={() => handleNavClick(item)}
                        pl="md"
                      />
                    ))}
                  </Collapse>
                </>
              ) : (
                group.items.map((item) => (
                  <NavLink
                    key={item.path}
                    label={item.label}
                    leftSection={item.icon}
                    active={item.selected}
                    onClick={() => handleNavClick(item)}
                  />
                ))
              )}
            </Box>
          ))}
        </Box>
      </ScrollArea>
    </Stack>
  );

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: DRAWER_WIDTH,
        breakpoint: 'md',
        collapsed: { mobile: !mobileOpened },
      }}
      padding={{ base: 'md', md: 'lg' }}
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
            {isMobile ? (
              <Burger
                opened={mobileOpened}
                onClick={() => setMobileOpened((o) => !o)}
                size="sm"
                aria-label="Toggle navigation"
              />
            ) : null}
            <Text fw={600} size="lg" lineClamp={1} style={{ minWidth: 0 }}>
              {subtitle || title}
            </Text>
          </Group>
          <Group gap="xs" wrap="nowrap">
            {headerExtra}
            <ActionIcon
              variant="subtle"
              color="gray"
              onClick={toggleColorMode}
              aria-label="Toggle color mode"
            >
              {mode === 'dark' ? <Brightness7 fontSize="small" /> : <Brightness4 fontSize="small" />}
            </ActionIcon>
            <Menu shadow="md" width={220} position="bottom-end">
              <Menu.Target>
                <ActionIcon variant="subtle" radius="xl" size="lg" aria-label="User menu">
                  <Avatar size={32} radius="xl" color="codex">
                    {user?.initial || 'U'}
                  </Avatar>
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                {user?.email ? (
                  <Menu.Item disabled>
                    <Text size="sm" lineClamp={1}>
                      {user.email}
                    </Text>
                  </Menu.Item>
                ) : null}
                <Menu.Divider />
                <Menu.Item
                  color="red"
                  leftSection={<Logout fontSize="small" />}
                  onClick={onLogout}
                >
                  Logout
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p={0}>{drawerContent}</AppShell.Navbar>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
