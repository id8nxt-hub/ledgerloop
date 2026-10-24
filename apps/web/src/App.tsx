import { useEffect, useState } from "react";
import { InvoiceDetailPage, InvoicesPage } from "./pages/Invoices.tsx";
import { PaymentsPage } from "./pages/Payments.tsx";
import { SettlementPage } from "./pages/Settlement.tsx";

// Hash routes keep the app to one static page: #/settlement, #/payments, #/invoices/INV-2026-0187
function useRoute(): string[] {
  const read = () => (window.location.hash.replace(/^#\/?/, "") || "settlement").split("/");
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const onChange = () => setRoute(read());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}

const tabs = [
  ["settlement", "Settlement"],
  ["payments", "Payments"],
  ["invoices", "Invoices"],
];

export function App() {
  const [page, id] = useRoute();
  return (
    <>
      <header className="top">
        <strong className="brand">LedgerLoop</strong>
        <nav>
          {tabs.map(([key, label]) => (
            <a key={key} href={`#/${key}`} className={page === key ? "active" : ""}>
              {label}
            </a>
          ))}
        </nav>
        <span className="merchant">LedgerLoop Demo · synthetic data</span>
      </header>
      <main>
        {page === "payments" && <PaymentsPage />}
        {page === "invoices" && (id ? <InvoiceDetailPage number={id} /> : <InvoicesPage />)}
        {page === "settlement" && <SettlementPage />}
      </main>
    </>
  );
}
