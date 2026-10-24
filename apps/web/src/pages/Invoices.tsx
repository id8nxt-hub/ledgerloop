import { formatINR } from "@ledgerloop/ledger";
import { api } from "../api.ts";
import { useApi } from "../useApi.ts";

export function InvoicesPage() {
  const [invoices, error] = useApi(api.invoices);
  if (error) return <p className="error">{error}</p>;
  if (!invoices) return <p>Loading invoices…</p>;
  return (
    <section>
      <h1>Invoices</h1>
      <table>
        <thead>
          <tr>
            <th>Invoice</th>
            <th>Customer</th>
            <th>Issued</th>
            <th className="num">Total</th>
            <th className="num">Due</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((i) => (
            <tr key={i.number}>
              <td>
                <a href={`#/invoices/${i.number}`}>{i.number}</a>
              </td>
              <td>{i.customer}</td>
              <td>{i.issuedOn}</td>
              <td className="num">{formatINR(i.totalPaise)}</td>
              <td className="num">{i.duePaise ? formatINR(i.duePaise) : "Paid"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export function InvoiceDetailPage({ number }: { number: string }) {
  const [invoice, error] = useApi(() => api.invoice(number), number);
  if (error) return <p className="error">{error}</p>;
  if (!invoice) return <p>Loading {number}…</p>;
  return (
    <section>
      <p>
        <a href="#/invoices">← Invoices</a>
      </p>
      <h1>{invoice.number}</h1>
      <p className="muted">
        {invoice.customer} · GSTIN {invoice.gstin} · issued {invoice.issuedOn} · due {invoice.dueOn}
      </p>
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th className="num">Qty</th>
            <th className="num">Unit price</th>
            <th className="num">GST</th>
            <th className="num">Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.lines.map((l) => (
            <tr key={l.sku}>
              <td>{l.description}</td>
              <td className="num">{l.qty}</td>
              <td className="num">{formatINR(l.unitPricePaise)}</td>
              <td className="num">{l.gstRate}%</td>
              <td className="num">{formatINR(l.qty * l.unitPricePaise)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={4}>Taxable value</td>
            <td className="num">{formatINR(invoice.totals.taxablePaise)}</td>
          </tr>
          {invoice.totals.byRate.map((r) => (
            <tr key={r.rate}>
              <td colSpan={4}>
                GST {r.rate}% on {formatINR(r.taxablePaise)}
              </td>
              <td className="num">{formatINR(r.taxPaise)}</td>
            </tr>
          ))}
          <tr className="total">
            <td colSpan={4}>Total</td>
            <td className="num" data-total>
              {formatINR(invoice.totals.totalPaise)}
            </td>
          </tr>
        </tfoot>
      </table>
      <p>
        {invoice.duePaise > 0 ? (
          <a className="button" href={`http://localhost:5174/?invoice=${invoice.number}`}>
            Open checkout for {formatINR(invoice.duePaise)}
          </a>
        ) : (
          "Paid in full."
        )}
      </p>
      {invoice.creditNotes.length > 0 && <p className="muted">Credit notes: {invoice.creditNotes.join(", ")}</p>}
    </section>
  );
}
