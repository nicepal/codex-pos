import TicketDetailView from '../../components/support/TicketDetailView';

export default function SupportDetailPage() {
  return (
    <TicketDetailView
      backTo="/support"
      backLabel="Back to tickets"
      showNotesTab={false}
    />
  );
}
