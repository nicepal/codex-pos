import { Modal } from '@mantine/core';

/** Consistent modal shell for POS dialogs migrating off MUI Dialog. */
export default function CodexModal({ children, title, opened, onClose, size = 'md', ...props }) {
  return (
    <Modal opened={opened} onClose={onClose} title={title} size={size} {...props}>
      {children}
    </Modal>
  );
}
