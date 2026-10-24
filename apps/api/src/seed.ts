import type { Db } from "./db.ts";

// Synthetic demo data. Every company, GSTIN, VPA and reference here is made up.

const customers = [
  ["C-001", "Nimbus Analytics LLP", "29AAAAN0001A1Z1", "Karnataka", "accounts@nimbus.example"],
  ["C-002", "Kaveri Freight Pvt Ltd", "33AAAAK0002B1Z2", "Tamil Nadu", "finance@kaveri.example"],
  ["C-003", "Saffron Lane Retail", "27AAAAS0003C1Z3", "Maharashtra", "billing@saffron.example"],
  ["C-004", "Teesta Tea Traders", "18AAAAT0004D1Z4", "Assam", "ap@teesta.example"],
  ["C-005", "Lotus Pond Clinics Pvt Ltd", "36AAAAL0005E1Z5", "Telangana", "finance@lotuspond.example"],
  ["C-006", "Konkan Coast Kiosks", "30AAAAK0006F1Z6", "Goa", "owner@konkan.example"],
];

const sku = {
  starter: ["LL-STARTER", "Starter plan, monthly", 49900, 18],
  growth: ["LL-GROWTH", "Growth plan, monthly", 149900, 18],
  seat: ["LL-SEAT", "Extra seat, monthly", 14900, 18],
  kit: ["LL-KIT", "Onboarding kit (printed)", 14900, 5],
  sms: ["LL-SMS100", "SMS reminder pack (100)", 4990, 18],
  topup: ["LL-SMSTOP", "SMS top-up (100)", 4990, 18],
} as const;
type Sku = keyof typeof sku;

// [number, customer, issued_on, [[sku, qty], ...]]
const invoices: [string, string, string, [Sku, number][]][] = [
  ["INV-2026-0176", "C-001", "2026-09-28", [["kit", 1], ["sms", 2], ["topup", 1]]],
  ["INV-2026-0180", "C-006", "2026-10-15", [["starter", 1], ["seat", 2]]],
  ["INV-2026-0181", "C-002", "2026-10-16", [["growth", 1]]],
  ["INV-2026-0182", "C-003", "2026-10-16", [["starter", 1]]],
  ["INV-2026-0183", "C-004", "2026-10-16", [["starter", 1]]],
  ["INV-2026-0184", "C-005", "2026-10-16", [["starter", 1]]],
  ["INV-2026-0185", "C-006", "2026-10-17", [["growth", 1], ["seat", 3]]],
  ["INV-2026-0186", "C-002", "2026-10-17", [["starter", 1]]],
  ["INV-2026-0187", "C-001", "2026-10-18", [["kit", 1], ["sms", 2], ["topup", 1]]],
  ["INV-2026-0188", "C-003", "2026-10-19", [["growth", 1]]],
  ["INV-2026-0189", "C-004", "2026-10-19", [["sms", 4]]],
  ["INV-2026-0190", "C-005", "2026-10-20", [["starter", 1]]],
];

// [id, invoice, payer VPA, amount (paise), status, rrn, created_at, settled_at]
const payments: [string, string, string, number, string, string | null, string, string | null][] = [
  ["PAY-1036", "INV-2026-0176", "accounts.nimbus@okmock", 33309, "SETTLED", "627410334871", "2026-10-01T11:02:00+05:30", "2026-10-01T11:02:30+05:30"],
  ["PAY-1039", "INV-2026-0180", "konkan.kiosks@okmock", 94046, "SETTLED", "629209170266", "2026-10-19T09:17:00+05:30", "2026-10-19T09:17:20+05:30"],
  ["PAY-1041", "INV-2026-0182", "saffron.lane@okmock", 58882, "SETTLED", "629309581104", "2026-10-20T09:58:00+05:30", "2026-10-20T09:58:40+05:30"],
  ["PAY-1042", "INV-2026-0183", "teesta.tea@okmock", 58882, "SETTLED", "629310020417", "2026-10-20T10:02:00+05:30", "2026-10-20T10:02:25+05:30"],
  ["PAY-1043", "INV-2026-0184", "lotus.pond@okmock", 58882, "SETTLED", "629310150932", "2026-10-20T10:15:00+05:30", "2026-10-20T10:15:30+05:30"],
  ["PAY-1044", "INV-2026-0181", "kaveri.freight@okmock", 176882, "SETTLED", "629311402268", "2026-10-20T11:40:00+05:30", "2026-10-20T11:40:20+05:30"],
  ["PAY-1045", "INV-2026-0185", "konkan.kiosks@okmock", 229628, "SETTLED", "629412115530", "2026-10-21T12:11:00+05:30", "2026-10-21T12:11:40+05:30"],
  ["PAY-1046", "INV-2026-0186", "kaveri.freight@okmock", 58882, "FAILED", null, "2026-10-21T15:30:00+05:30", null],
  ["PAY-1047", "INV-2026-0186", "kaveri.freight@okmock", 58882, "SETTLED", "629415334719", "2026-10-21T15:33:00+05:30", "2026-10-21T15:33:30+05:30"],
  ["PAY-1048", "INV-2026-0189", "teesta.tea@okmock", 23553, "SETTLED", "629510086652", "2026-10-22T10:08:00+05:30", "2026-10-22T10:08:15+05:30"],
  ["PAY-1049", "INV-2026-0190", "lotus.pond@okmock", 58882, "SETTLED", "629516440193", "2026-10-22T16:44:00+05:30", "2026-10-22T16:44:30+05:30"],
  ["PAY-1050", "INV-2026-0190", "lotus.pond@okmock", 58882, "REFUNDED", "629516470815", "2026-10-22T16:47:00+05:30", "2026-10-22T16:47:20+05:30"],
  ["PAY-1051", "INV-2026-0188", "saffron.lane@okmock", 176882, "PENDING", null, "2026-10-23T18:05:00+05:30", null],
];

// Bank statement lines, in the order the bank's file listed them. [id, date, amount, rrn, posted_at, narration]
const bankLines: [string, string, number, string | null, string, string][] = [
  ["BNK-19-01", "2026-10-19", 94046, "629209170266", "2026-10-19T09:18:00+05:30", "UPI/CR/629209170266/KONKAN COAST/OKMOCK"],
  ["BNK-20-01", "2026-10-20", 176882, "629311402268", "2026-10-20T11:41:00+05:30", "UPI/CR/629311402268/KAVERI FREIGHT/OKMOCK"],
  ["BNK-20-02", "2026-10-20", 58882, null, "2026-10-20T09:59:00+05:30", "UPI/CR/NA/SAFFRON LANE/OKMOCK"],
  ["BNK-20-03", "2026-10-20", 58882, null, "2026-10-20T10:16:00+05:30", "UPI/CR/NA/LOTUS POND/OKMOCK"],
  ["BNK-20-04", "2026-10-20", 58882, "629310020417", "2026-10-20T10:03:00+05:30", "UPI/CR/629310020417/TEESTA TEA/OKMOCK"],
  ["BNK-21-01", "2026-10-21", 229628, "629412115530", "2026-10-21T12:12:00+05:30", "UPI/CR/629412115530/KONKAN COAST/OKMOCK"],
  ["BNK-21-02", "2026-10-21", 58882, "629415334719", "2026-10-21T15:34:00+05:30", "UPI/CR/629415334719/KAVERI FREIGHT/OKMOCK"],
  ["BNK-22-01", "2026-10-22", 23553, "629510086652", "2026-10-22T10:09:00+05:30", "UPI/CR/629510086652/TEESTA TEA/OKMOCK"],
  ["BNK-22-02", "2026-10-22", 58882, "629516440193", "2026-10-22T16:45:00+05:30", "UPI/CR/629516440193/LOTUS POND/OKMOCK"],
  ["BNK-22-03", "2026-10-22", 58882, "629516470815", "2026-10-22T16:48:00+05:30", "UPI/CR/629516470815/LOTUS POND/OKMOCK"],
];

export async function seed(db: Db): Promise<void> {
  for (const c of customers) {
    await db.query("INSERT INTO customers (id, name, gstin, state, email) VALUES ($1, $2, $3, $4, $5)", c);
  }
  for (const [number, customer, issuedOn, lines] of invoices) {
    const { rows } = await db.query<{ id: number }>(
      "INSERT INTO invoices (number, customer_id, issued_on, due_on) VALUES ($1, $2, $3, $3::date + 15) RETURNING id",
      [number, customer, issuedOn],
    );
    let position = 1;
    for (const [key, qty] of lines) {
      const [code, description, price, rate] = sku[key];
      await db.query(
        `INSERT INTO invoice_lines (invoice_id, position, sku, description, qty, unit_price_paise, gst_rate)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [rows[0].id, position++, code, description, qty, price, rate],
      );
    }
  }

  // Nimbus did not use the SMS packs on INV-2026-0176 and was credited for them.
  const { rows: cn } = await db.query<{ id: number }>(
    `INSERT INTO credit_notes (number, invoice_id, issued_on, reason)
     SELECT 'CN-2026-0042', id, '2026-10-10', 'Unused SMS packs returned' FROM invoices WHERE number = 'INV-2026-0176'
     RETURNING id`,
  );
  let position = 1;
  for (const [key, qty] of [["sms", 2], ["topup", 1]] as [Sku, number][]) {
    const [code, description, price, rate] = sku[key];
    await db.query(
      `INSERT INTO credit_note_lines (credit_note_id, position, sku, description, qty, unit_price_paise, gst_rate)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [cn[0].id, position++, code, description, qty, price, rate],
    );
  }

  for (const [id, invoice, vpa, amount, status, rrn, createdAt, settledAt] of payments) {
    await db.query(
      `INSERT INTO payments (id, invoice_id, payer_vpa, amount_paise, status, rrn, created_at, settled_at)
       SELECT $1, id, $3, $4, $5, $6, $7, $8 FROM invoices WHERE number = $2`,
      [id, invoice, vpa, amount, status, rrn, createdAt, settledAt],
    );
  }
  for (const line of bankLines) {
    await db.query(
      "INSERT INTO bank_lines (id, statement_date, amount_paise, rrn, posted_at, narration) VALUES ($1, $2, $3, $4, $5, $6)",
      line,
    );
  }
}
