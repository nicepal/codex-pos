import { Badge, Loader } from '@mantine/core';
import { CloudOff, CloudDone, Sync } from '@mui/icons-material';

export default function OfflineIndicator({ online }) {
  if (online) {
    return (
      <Badge
        size="md"
        variant="outline"
        color="teal"
        leftSection={<CloudDone sx={{ fontSize: 14 }} />}
        styles={{ root: { height: 28, textTransform: 'none', fontWeight: 500 } }}
      >
        Online
      </Badge>
    );
  }
  return (
    <Badge
      size="md"
      variant="filled"
      color="yellow"
      leftSection={<CloudOff sx={{ fontSize: 14 }} />}
      styles={{ root: { height: 28, textTransform: 'none', fontWeight: 600 } }}
    >
      Offline
    </Badge>
  );
}

export function SyncStatusChip({ pending = 0, syncing = false, onClick }) {
  if (!pending && !syncing) return null;
  return (
    <Badge
      size="md"
      variant="outline"
      color="blue"
      leftSection={syncing
        ? <Loader size={12} color="blue" />
        : <Sync sx={{ fontSize: 14 }} />}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : undefined, height: 28, textTransform: 'none' }}
    >
      {syncing ? `Syncing ${pending}…` : `${pending} pending`}
    </Badge>
  );
}
