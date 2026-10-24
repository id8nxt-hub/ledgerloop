// Label and colour for a payment's status, used on every payments screen.
const STATUS_STYLES: Record<string, { label: string; tone: string }> = {
  PENDING: { label: "Pending", tone: "amber" },
  SUCCESS: { label: "Settled", tone: "green" },
  FAILED: { label: "Failed", tone: "red" },
  REFUNDED: { label: "Refunded", tone: "grey" },
};

export function PaymentStatusBadge({ status }: { status: string }) {
  // A status we have no style for is still in flight.
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.PENDING;
  return (
    <span className={`badge badge-${style.tone}`} data-status={status}>
      {style.label}
    </span>
  );
}
