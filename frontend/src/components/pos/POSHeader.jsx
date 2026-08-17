import { useState } from 'react';
import {
  Box, Group, Text, ActionIcon, Button, Menu, Tooltip, Badge,
} from '@mantine/core';
import {
  ExitToApp, MoreVert, Lock, HelpOutline, PauseCircleOutline, Person,
  Keyboard, Storefront, AccountBalanceWallet, ReceiptLong, AssignmentReturn,
  Assessment, LockClock, Print, CloudOff, PointOfSale,
} from '@mui/icons-material';
import OfflineIndicator from './OfflineIndicator';
import SyncStatus from './SyncStatus';
import { CodexSelect } from '../../design-system';

export default function POSHeader({
  businessName,
  userName,
  branchId,
  branches = [],
  onBranchChange,
  online,
  pending = 0,
  syncing = false,
  hasPosPro,
  hasStaffPro,
  heldCount = 0,
  registerOpen = true,
  registerLabel = '',
  expectedCashLabel = '',
  onOpenHeld,
  onLock,
  onExit,
  onOpenHelp,
  onOpenCustomer,
  onOpenCashManagement,
  onOpenReceiptHistory,
  onOpenReturns,
  onOpenXReport,
  onCloseRegister,
  onOpenHardware,
  onOpenOfflineQueue,
  onOpenRegisterMenu,
  restaurantModeSelector,
}) {
  const [regMenuOpen, setRegMenuOpen] = useState(false);

  const registerItems = (
    <>
      {hasStaffPro && registerOpen && (
        <Menu.Item
          leftSection={<AccountBalanceWallet fontSize="small" />}
          onClick={() => onOpenCashManagement?.()}
        >
          Cash management
        </Menu.Item>
      )}
      <Menu.Item
        leftSection={<ReceiptLong fontSize="small" />}
        onClick={() => onOpenReceiptHistory?.()}
      >
        Receipt history
      </Menu.Item>
      {hasPosPro && (
        <Menu.Item
          leftSection={<PauseCircleOutline fontSize="small" />}
          onClick={() => onOpenHeld?.()}
        >
          Held sales
        </Menu.Item>
      )}
      {hasPosPro && (
        <Menu.Item
          leftSection={<AssignmentReturn fontSize="small" />}
          onClick={() => onOpenReturns?.()}
        >
          Returns
        </Menu.Item>
      )}
      {hasStaffPro && registerOpen && (
        <Menu.Item
          leftSection={<Assessment fontSize="small" />}
          onClick={() => onOpenXReport?.()}
        >
          X report
        </Menu.Item>
      )}
      {hasStaffPro && registerOpen && (
        <Menu.Item
          leftSection={<LockClock fontSize="small" />}
          onClick={() => onCloseRegister?.()}
        >
          Close register
        </Menu.Item>
      )}
      {!registerOpen && hasStaffPro && (
        <Menu.Item
          leftSection={<PointOfSale fontSize="small" />}
          onClick={() => onOpenRegisterMenu?.()}
        >
          Open register
        </Menu.Item>
      )}
      <Menu.Item
        leftSection={<Print fontSize="small" />}
        onClick={() => onOpenHardware?.()}
      >
        Hardware
      </Menu.Item>
      <Menu.Item
        leftSection={<CloudOff fontSize="small" />}
        onClick={() => onOpenOfflineQueue?.()}
      >
        Offline queue
      </Menu.Item>
      <Menu.Item
        leftSection={<Keyboard fontSize="small" />}
        onClick={() => onOpenHelp?.()}
      >
        Shortcuts
      </Menu.Item>
      {hasStaffPro && (
        <Menu.Item
          leftSection={<Lock fontSize="small" />}
          onClick={() => onLock?.()}
        >
          Lock
        </Menu.Item>
      )}
    </>
  );

  return (
    <Box
      component="header"
      px={{ base: 'xs', sm: 'md' }}
      py="xs"
      style={{
        borderBottom: '1px solid var(--mantine-color-default-border)',
        background: 'var(--codex-surface, var(--mantine-color-body))',
        flexShrink: 0,
      }}
    >
      <Group gap="xs" wrap="nowrap" justify="space-between" mih={48}>
        <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
          <Box visibleFrom="sm" c="codex" style={{ display: 'flex' }}>
            <Storefront />
          </Box>
          <Box style={{ minWidth: 0 }}>
            <Text fw={800} size="sm" lineClamp={1} lh={1.2}>
              {businessName || 'CodexPOS'}
            </Text>
            <Text size="xs" c="dimmed" lineClamp={1}>
              CodexPOS · Register
            </Text>
          </Box>

          {hasStaffPro && (
            <Menu
              opened={regMenuOpen}
              onChange={setRegMenuOpen}
              position="bottom-start"
              withinPortal
            >
              <Menu.Target>
                <Badge
                  size="md"
                  variant={registerOpen ? 'filled' : 'outline'}
                  color={registerOpen ? 'teal' : 'yellow'}
                  leftSection={<PointOfSale sx={{ fontSize: 14 }} />}
                  style={{
                    cursor: 'pointer',
                    fontWeight: 600,
                    maxWidth: 220,
                    textTransform: 'none',
                  }}
                >
                  {registerOpen
                    ? (registerLabel || 'Register open')
                    : 'Register closed'}
                </Badge>
              </Menu.Target>
              <Menu.Dropdown>{registerItems}</Menu.Dropdown>
            </Menu>
          )}

          {hasStaffPro && registerOpen && expectedCashLabel && (
            <Text size="xs" c="dimmed" visibleFrom="lg" style={{ whiteSpace: 'nowrap' }}>
              Expected {expectedCashLabel}
            </Text>
          )}

          {restaurantModeSelector ? (
            <Box visibleFrom="md" ml={4}>
              {restaurantModeSelector}
            </Box>
          ) : null}

          <Box visibleFrom="md" maw={180} miw={120}>
            <CodexSelect
              native
              aria-label="Branch"
              value={branchId || ''}
              onChange={(e) => onBranchChange(e.currentTarget.value)}
              data={[
                { value: '', label: 'Default branch' },
                ...(branches || []).map((b) => ({ value: b.id, label: b.name })),
              ]}
            />
          </Box>
        </Group>

        <Group gap="xs" wrap="nowrap">
          <OfflineIndicator online={online} />
          <SyncStatus
            pending={pending}
            syncing={syncing}
            onClick={onOpenOfflineQueue}
          />

          {hasPosPro && (
            <Tooltip label="Held sales (F6)">
              <Button
                size="sm"
                variant="outline"
                leftSection={<PauseCircleOutline fontSize="small" />}
                onClick={onOpenHeld}
                visibleFrom="sm"
                styles={{ root: { minHeight: 40 } }}
              >
                Held ({heldCount})
              </Button>
            </Tooltip>
          )}

          <Tooltip label="Customer (F4)">
            <ActionIcon
              variant="subtle"
              size={44}
              onClick={onOpenCustomer}
              aria-label="Select customer"
            >
              <Person />
            </ActionIcon>
          </Tooltip>

          <Tooltip label="Keyboard shortcuts">
            <ActionIcon
              variant="subtle"
              size={44}
              onClick={onOpenHelp}
              aria-label="Help"
            >
              <HelpOutline />
            </ActionIcon>
          </Tooltip>

          <Menu position="bottom-end" withinPortal>
            <Menu.Target>
              <ActionIcon variant="subtle" size={44} aria-label="Register menu">
                <MoreVert />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              {userName && (
                <>
                  <Menu.Label>{userName}</Menu.Label>
                  <Menu.Divider />
                </>
              )}
              {registerItems}
            </Menu.Dropdown>
          </Menu>

          <Button
            variant="outline"
            color="gray"
            leftSection={<ExitToApp fontSize="small" />}
            onClick={onExit}
            visibleFrom="sm"
            styles={{ root: { minHeight: 44, fontWeight: 600 } }}
          >
            Exit POS
          </Button>
          <ActionIcon
            variant="subtle"
            size={44}
            onClick={onExit}
            aria-label="Exit POS"
            hiddenFrom="sm"
          >
            <ExitToApp />
          </ActionIcon>
        </Group>
      </Group>
    </Box>
  );
}
