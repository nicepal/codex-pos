import TicketDetailView from '../../components/support/TicketDetailView';

export default function TicketDetailPage() {
  return (
    <TicketDetailView
      backTo="/admin/tickets"
      backLabel="Back to tickets"
      showNotesTab
    />
  );
}
