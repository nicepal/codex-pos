import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Button, TextField, Stack, Grid, Card, CardContent,
  Tabs, Tab, MenuItem, Select, FormControl, Avatar, IconButton, Tooltip,
  Divider, alpha, useTheme,
} from '@mui/material';
import {
  ArrowBack, ContentCopy, CheckCircleOutline, Send, MoreVert,
  AttachFile, ImageOutlined, DescriptionOutlined, Download,
} from '@mui/icons-material';
import api from '../../services/api';
import LoadingState from '../LoadingState';
import { formatDisplayText } from '../../utils/displayText';

const STATUS_STYLES = {
  open: { color: '#94a3b8', bg: alpha('#94a3b8', 0.15) },
  in_progress: { color: '#3b82f6', bg: alpha('#3b82f6', 0.15) },
  resolved: { color: '#10b981', bg: alpha('#10b981', 0.15) },
  closed: { color: '#64748b', bg: alpha('#64748b', 0.15) },
};

const PRIORITY_STYLES = {
  low: { color: '#94a3b8', bg: alpha('#94a3b8', 0.15) },
  medium: { color: '#f59e0b', bg: alpha('#f59e0b', 0.15) },
  high: { color: '#f97316', bg: alpha('#f97316', 0.15) },
  critical: { color: '#ef4444', bg: alpha('#ef4444', 0.15) },
};

function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function Pill({ label, styles }) {
  const cfg = styles[label?.toLowerCase()] || { color: '#94a3b8', bg: alpha('#94a3b8', 0.15) };
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        px: 1.5,
        py: 0.35,
        borderRadius: 999,
        bgcolor: cfg.bg,
        color: cfg.color,
        fontSize: 13,
        fontWeight: 600,
        textTransform: 'capitalize',
      }}
    >
      {formatDisplayText(label) || '—'}
    </Box>
  );
}

function RoleBadge({ roles }) {
  const isSupport = roles?.some((r) => ['super_admin', 'support_agent', 'billing_manager'].includes(r));
  const color = isSupport ? '#10b981' : '#3b82f6';
  return (
    <Box
      component="span"
      sx={{
        px: 1,
        py: 0.15,
        borderRadius: 1,
        bgcolor: alpha(color, 0.12),
        color,
        fontSize: 11,
        fontWeight: 700,
        ml: 1,
      }}
    >
      {isSupport ? 'Support' : 'Customer'}
    </Box>
  );
}

function SidebarSection({ title, children }) {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>{title}</Typography>
      {children}
    </Box>
  );
}

function SidebarRow({ label, children }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 1 }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Box>{children}</Box>
    </Stack>
  );
}

function MessageBlock({ message }) {
  const name = [message.first_name, message.last_name].filter(Boolean).join(' ') || message.email || 'User';
  const initial = (name[0] || 'U').toUpperCase();

  return (
    <Box sx={{ display: 'flex', gap: 2, py: 2.5 }}>
      <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main', fontSize: 16, fontWeight: 700 }}>
        {initial}
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
          <Box>
            <Typography component="span" fontWeight={700}>{name}</Typography>
            <RoleBadge roles={message.roles} />
            <Typography variant="caption" color="text.secondary" sx={{ ml: 1.5 }}>
              {formatDateTime(message.created_at)}
            </Typography>
          </Box>
          <IconButton size="small" sx={{ color: 'text.disabled' }}>
            <MoreVert fontSize="small" />
          </IconButton>
        </Stack>
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
          {message.message}
        </Typography>
      </Box>
    </Box>
  );
}

function collectAttachments(messages = []) {
  const items = [];
  messages.forEach((m) => {
    const attachments = Array.isArray(m.attachments) ? m.attachments : [];
    attachments.forEach((a) => {
      items.push({ ...a, message_id: m.id });
    });
  });
  return items;
}

export default function TicketDetailView({ backTo, backLabel = 'Back to tickets', showNotesTab = false }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const { id: ticketId } = useParams();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState(0);
  const [sortOrder, setSortOrder] = useState('oldest');
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['ticket', ticketId],
    queryFn: () => api.get(`/tickets/${ticketId}`).then((r) => r.data.data),
  });

  const invalidate = () => queryClient.invalidateQueries(['ticket', ticketId]);

  const reply = useMutation({
    mutationFn: (payload) => api.post(`/tickets/${ticketId}/reply`, payload),
    onSuccess: () => { setMessage(''); invalidate(); },
  });

  const resolve = useMutation({
    mutationFn: () => api.post(`/tickets/${ticketId}/resolve`),
    onSuccess: invalidate,
  });

  const publicMessages = useMemo(() => {
    const msgs = (ticket?.messages || []).filter((m) => !m.is_internal);
    return sortOrder === 'newest' ? [...msgs].reverse() : msgs;
  }, [ticket?.messages, sortOrder]);

  const noteMessages = useMemo(() => {
    const msgs = (ticket?.messages || []).filter((m) => m.is_internal);
    return sortOrder === 'newest' ? [...msgs].reverse() : msgs;
  }, [ticket?.messages, sortOrder]);

  const attachments = useMemo(() => collectAttachments(ticket?.messages), [ticket?.messages]);
  const noteCount = (ticket?.messages || []).filter((m) => m.is_internal).length;
  const isResolved = ['resolved', 'closed'].includes(ticket?.status);
  const customer = ticket?.customer;
  const customerName = customer
    ? [customer.first_name, customer.last_name].filter(Boolean).join(' ')
    : '—';

  const copyTicketNumber = async () => {
    if (!ticket?.ticket_number) return;
    await navigator.clipboard.writeText(ticket.ticket_number);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = (isInternal = false) => {
    if (!message.trim()) return;
    reply.mutate({ message: message.trim(), is_internal: isInternal });
  };

  if (isLoading) return <LoadingState message="Loading ticket…" />;
  if (!ticket) return <Typography>Ticket not found</Typography>;

  const activeMessages = tab === 1 && showNotesTab ? noteMessages : publicMessages;

  return (
    <Box>
      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate(backTo)}
        sx={{ mb: 3, color: 'primary.main', fontWeight: 600, px: 0 }}
      >
        {backLabel}
      </Button>

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', md: 'flex-start' }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" fontWeight={800} lineHeight={1.25} gutterBottom>
            {ticket.subject}
          </Typography>
          <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" sx={{ mb: 1 }}>
            <Typography color="text.secondary" fontWeight={600}>
              #{ticket.ticket_number}
            </Typography>
            <Tooltip title={copied ? 'Copied!' : 'Copy ticket number'}>
              <IconButton size="small" onClick={copyTicketNumber} sx={{ color: 'text.secondary' }}>
                <ContentCopy sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
            <Pill label={ticket.status} styles={STATUS_STYLES} />
          </Stack>
          {ticket.description && (
            <Typography color="text.secondary" sx={{ maxWidth: 720 }}>
              {ticket.description}
            </Typography>
          )}
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ flexShrink: 0 }}>
          {!isResolved && (
            <Button
              variant="outlined"
              startIcon={<CheckCircleOutline />}
              onClick={() => resolve.mutate()}
              disabled={resolve.isPending}
            >
              Mark as Resolved
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={<Send />}
            onClick={() => {
              const el = document.getElementById('ticket-reply-box');
              el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              el?.focus();
            }}
          >
            Reply to Ticket
          </Button>
        </Stack>
      </Stack>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <Card sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
            <CardContent sx={{ p: 0 }}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ px: 3, borderBottom: '1px solid', borderColor: 'divider' }}
              >
                <Tabs
                  value={tab}
                  onChange={(_, v) => setTab(v)}
                  sx={{ minHeight: 48 }}
                >
                  <Tab label="Conversation" sx={{ textTransform: 'none', fontWeight: 600 }} />
                  {showNotesTab && (
                    <Tab label={`Notes (${noteCount})`} sx={{ textTransform: 'none', fontWeight: 600 }} />
                  )}
                </Tabs>
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <Select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    displayEmpty
                    sx={{ fontSize: 14 }}
                  >
                    <MenuItem value="oldest">Oldest first</MenuItem>
                    <MenuItem value="newest">Newest first</MenuItem>
                  </Select>
                </FormControl>
              </Stack>

              <Box sx={{ px: 3 }}>
                {activeMessages.length === 0 ? (
                  <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                    {tab === 1 ? 'No internal notes yet.' : 'No messages yet. Start the conversation below.'}
                  </Typography>
                ) : (
                  activeMessages.map((m, idx) => (
                    <Box key={m.id}>
                      <MessageBlock message={m} />
                      {idx < activeMessages.length - 1 && <Divider />}
                    </Box>
                  ))
                )}
              </Box>

              {!isResolved && (
                <Box
                  id="ticket-reply-box"
                  sx={{
                    m: 3,
                    mt: 2,
                    p: 2.5,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: alpha(theme.palette.background.default, 0.5),
                  }}
                >
                  <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                    {tab === 1 && showNotesTab ? 'Add internal note' : 'Reply to this ticket'}
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    minRows={4}
                    placeholder="Type your message here..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    sx={{
                      mb: 1.5,
                      '& .MuiOutlinedInput-root': { bgcolor: 'background.paper' },
                    }}
                  />
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" spacing={0.5}>
                      <IconButton size="small" sx={{ color: 'text.secondary' }}><AttachFile fontSize="small" /></IconButton>
                      <IconButton size="small" sx={{ color: 'text.secondary' }}><ImageOutlined fontSize="small" /></IconButton>
                      <IconButton size="small" sx={{ color: 'text.secondary' }}><DescriptionOutlined fontSize="small" /></IconButton>
                    </Stack>
                    <Button
                      variant="contained"
                      endIcon={<Send />}
                      onClick={() => handleSend(tab === 1 && showNotesTab)}
                      disabled={!message.trim() || reply.isPending}
                    >
                      {tab === 1 && showNotesTab ? 'Add Note' : 'Send Reply'}
                    </Button>
                  </Stack>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Card sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none', mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <SidebarSection title="Ticket Details">
                <SidebarRow label="Status"><Pill label={ticket.status} styles={STATUS_STYLES} /></SidebarRow>
                <SidebarRow label="Priority"><Pill label={ticket.priority} styles={PRIORITY_STYLES} /></SidebarRow>
                <SidebarRow label="Category">
                  <Typography variant="body2" fontWeight={600} sx={{ textTransform: 'capitalize' }}>
                    {ticket.category || '—'}
                  </Typography>
                </SidebarRow>
                <SidebarRow label="Created At">
                  <Typography variant="body2" fontWeight={600}>{formatDateTime(ticket.created_at)}</Typography>
                </SidebarRow>
                <SidebarRow label="Last Updated">
                  <Typography variant="body2" fontWeight={600}>{formatDateTime(ticket.updated_at)}</Typography>
                </SidebarRow>
              </SidebarSection>

              <Divider sx={{ my: 2 }} />

              <SidebarSection title="Customer Information">
                <SidebarRow label="Name">
                  <Typography variant="body2" fontWeight={600}>{customerName}</Typography>
                </SidebarRow>
                <SidebarRow label="Email">
                  <Typography variant="body2" fontWeight={600}>{customer?.email || '—'}</Typography>
                </SidebarRow>
                <SidebarRow label="Phone">
                  <Typography variant="body2" fontWeight={600}>{customer?.phone || '—'}</Typography>
                </SidebarRow>
              </SidebarSection>

              {attachments.length > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <SidebarSection title={`Attachments (${attachments.length})`}>
                    {attachments.map((file, idx) => (
                      <Stack
                        key={`${file.message_id}-${idx}`}
                        direction="row"
                        alignItems="center"
                        spacing={1.5}
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: 'divider',
                          mb: 1,
                        }}
                      >
                        <DescriptionOutlined color="primary" />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={600} noWrap>
                            {file.name || file.filename || 'Attachment'}
                          </Typography>
                          {file.size && (
                            <Typography variant="caption" color="text.secondary">
                              {(file.size / 1024).toFixed(1)} KB
                            </Typography>
                          )}
                        </Box>
                        {file.url && (
                          <IconButton
                            size="small"
                            component="a"
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Download fontSize="small" />
                          </IconButton>
                        )}
                      </Stack>
                    ))}
                  </SidebarSection>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
