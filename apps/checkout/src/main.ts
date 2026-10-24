// Hosted checkout: http://localhost:5174/?invoice=INV-2026-0187
// 1. Load the invoice. 2. Start a UPI collect request. 3. The mock UPI app approves or declines it.
// 4. Poll the ledger until the payment leaves PENDING.

interface Invoice {
  number: string;
  customer: string;
  duePaise: number;
  totalPaise: number;
}
interface Payment {
  id: string;
  status: "PENDING" | "SETTLED" | "FAILED" | "REFUNDED";
  amountPaise: number;
  rrn: string | null;
}

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const rupees = (paise: number) =>
  `₹${new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2 }).format(Math.floor(paise / 100) + (paise % 100) / 100)}`;

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: body ? { "content-type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? `${path}: ${res.status}`);
  return data as T;
}

const say = (text: string, tone = "") => {
  const status = $("status");
  status.textContent = text;
  status.className = tone;
};

const number = new URLSearchParams(location.search).get("invoice") ?? "INV-2026-0187";

async function load() {
  const invoice = await call<Invoice>("GET", `/api/invoices/${encodeURIComponent(number)}`);
  $("invoice").innerHTML = `
    <h1>${rupees(invoice.duePaise)}</h1>
    <p>Invoice <strong>${invoice.number}</strong> for ${invoice.customer}</p>`;
  if (invoice.duePaise > 0) {
    $("pay").hidden = false;
    $("pay-button").textContent = `Pay ${rupees(invoice.duePaise)} with UPI`;
  } else {
    say("This invoice is already paid.", "ok");
  }
}

async function waitForLedger(id: string): Promise<Payment> {
  for (let i = 0; i < 20; i++) {
    const payment = await call<Payment>("GET", `/api/payments/${id}`);
    if (payment.status !== "PENDING") return payment;
    await new Promise((r) => setTimeout(r, 500));
  }
  return call<Payment>("GET", `/api/payments/${id}`);
}

$("pay").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const vpa = ($("vpa") as HTMLInputElement).value.trim();
    const { payment } = await call<{ payment: Payment }>("POST", "/api/checkout", { invoiceNumber: number, payerVpa: vpa });
    $("pay").hidden = true;
    $("mock-upi").hidden = false;
    $("upi-request").textContent = `Collect request from ledgerloop.demo@mockupi for ${rupees(payment.amountPaise)} (${payment.id}).`;
    say("Waiting for you to approve in your UPI app…");

    const decide = async (action: "approve" | "decline") => {
      $("mock-upi").hidden = true;
      await call("POST", `/api/mock-upi/${payment.id}/${action}`);
      const final = await waitForLedger(payment.id);
      if (final.status === "SETTLED") say(`Payment settled. ${payment.id}, UPI ref ${final.rrn}.`, "ok");
      else say(`Payment ${final.status.toLowerCase()}. ${payment.id}. You can try again.`, "warn");
      const link = document.createElement("a");
      link.href = "http://localhost:5173/#/payments";
      link.textContent = "See it on the payments screen";
      $("status").append(document.createElement("br"), link);
    };
    $("approve").onclick = () => decide("approve");
    $("decline").onclick = () => decide("decline");
  } catch (error) {
    say((error as Error).message, "warn");
  }
});

load().catch((error: Error) => say(`Could not load ${number}: ${error.message}. Is pnpm dev running?`, "warn"));
