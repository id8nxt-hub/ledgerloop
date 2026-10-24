import { formatINR } from "@ledgerloop/ledger";
import { api } from "../api.ts";
import { useApi } from "../useApi.ts";

export function SettlementPage() {
  const [days, daysError] = useApi(api.settlement);
  const [recon, reconError] = useApi(api.reconciliation);
  const [payments] = useApi(api.payments);
  const error = daysError ?? reconError;
  if (error) return <p className="error">{error}</p>;
  if (!days || !recon) return <p>Loading settlement…</p>;

  const count = (status: string) => payments?.filter((p) => p.status === status).length ?? 0;
  const settled = days.reduce((sum, d) => sum + d.netPaise, 0);

  return (
    <section>
      <h1>Settlement</h1>
      <div className="tiles">
        <div className="tile">
          <span>Settled to date, net</span>
          <strong>{formatINR(settled)}</strong>
        </div>
        <div className="tile">
          <span>Settled payments</span>
          <strong>{count("SETTLED")}</strong>
        </div>
        <div className="tile">
          <span>Pending</span>
          <strong>{count("PENDING")}</strong>
        </div>
        <div className="tile">
          <span>Failed</span>
          <strong>{count("FAILED")}</strong>
        </div>
      </div>

      <h2>Settled by day</h2>
      <table>
        <thead>
          <tr>
            <th>Date (IST)</th>
            <th className="num">Payments</th>
            <th className="num">Gross</th>
            <th className="num">Refunds</th>
            <th className="num">Net</th>
          </tr>
        </thead>
        <tbody>
          {days.map((d) => (
            <tr key={d.date}>
              <td>{d.date}</td>
              <td className="num">{d.payments}</td>
              <td className="num">{formatINR(d.grossPaise)}</td>
              <td className="num">{d.refundsPaise ? formatINR(d.refundsPaise) : "–"}</td>
              <td className="num">{formatINR(d.netPaise)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Bank reconciliation</h2>
      <table>
        <thead>
          <tr>
            <th>Statement</th>
            <th className="num">Bank</th>
            <th className="num">Ledger</th>
            <th className="num">Matched</th>
            <th>Unmatched</th>
          </tr>
        </thead>
        <tbody>
          {recon.map(({ date, report }) => {
            const clean = report.unmatchedBankLines.length === 0 && report.unmatchedPayments.length === 0;
            return (
              <tr key={date} data-reconciliation={date}>
                <td>{date}</td>
                <td className="num">{formatINR(report.bankPaise)}</td>
                <td className="num">{formatINR(report.ledgerPaise)}</td>
                <td className="num">{report.matched.length}</td>
                <td className={clean ? "ok" : "warn"}>
                  {clean
                    ? "None"
                    : [...report.unmatchedBankLines, ...report.unmatchedPayments].join(", ")}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
