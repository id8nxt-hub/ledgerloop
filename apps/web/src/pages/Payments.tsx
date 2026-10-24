import { formatINR } from "@ledgerloop/ledger";
import { api } from "../api.ts";
import { PaymentStatusBadge } from "../components/PaymentStatusBadge.tsx";
import { useApi } from "../useApi.ts";

const time = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });

export function PaymentsPage() {
  const [payments, error] = useApi(api.payments);
  if (error) return <p className="error">{error}</p>;
  if (!payments) return <p>Loading payments…</p>;
  return (
    <section>
      <h1>Payments</h1>
      <p className="muted">UPI payments as the ledger records them, newest first.</p>
      <table>
        <thead>
          <tr>
            <th>Payment</th>
            <th>Invoice</th>
            <th>Payer</th>
            <th className="num">Amount</th>
            <th>Status</th>
            <th>Created (IST)</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((p) => (
            <tr key={p.id} data-payment={p.id}>
              <td>{p.id}</td>
              <td>
                <a href={`#/invoices/${p.invoiceNumber}`}>{p.invoiceNumber}</a>
              </td>
              <td>{p.payerVpa}</td>
              <td className="num">{formatINR(p.amountPaise)}</td>
              <td>
                <PaymentStatusBadge status={p.status} />
              </td>
              <td>{time.format(new Date(p.createdAt))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
