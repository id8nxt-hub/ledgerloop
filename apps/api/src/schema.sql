-- LedgerLoop schema. Every amount is an integer number of paise.
CREATE TABLE IF NOT EXISTS customers (
  id         text PRIMARY KEY,
  name       text NOT NULL,
  gstin      text NOT NULL,        -- synthetic
  state      text NOT NULL,
  email      text NOT NULL         -- synthetic
);

CREATE TABLE IF NOT EXISTS invoices (
  id          serial PRIMARY KEY,
  number      text NOT NULL UNIQUE, -- INV-2026-0187
  customer_id text NOT NULL REFERENCES customers (id),
  issued_on   date NOT NULL,
  due_on      date NOT NULL
);

CREATE TABLE IF NOT EXISTS invoice_lines (
  id               serial PRIMARY KEY,
  invoice_id       integer NOT NULL REFERENCES invoices (id),
  position         integer NOT NULL,
  sku              text NOT NULL,
  description      text NOT NULL,
  qty              integer NOT NULL CHECK (qty > 0),
  unit_price_paise integer NOT NULL,
  gst_rate         integer NOT NULL
);

CREATE TABLE IF NOT EXISTS credit_notes (
  id         serial PRIMARY KEY,
  number     text NOT NULL UNIQUE,  -- CN-2026-0042
  invoice_id integer NOT NULL REFERENCES invoices (id),
  issued_on  date NOT NULL,
  reason     text NOT NULL
);

CREATE TABLE IF NOT EXISTS credit_note_lines (
  id               serial PRIMARY KEY,
  credit_note_id   integer NOT NULL REFERENCES credit_notes (id),
  position         integer NOT NULL,
  sku              text NOT NULL,
  description      text NOT NULL,
  qty              integer NOT NULL CHECK (qty > 0),
  unit_price_paise integer NOT NULL,
  gst_rate         integer NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
  id           text PRIMARY KEY,    -- PAY-1042
  invoice_id   integer NOT NULL REFERENCES invoices (id),
  method       text NOT NULL DEFAULT 'UPI',
  payer_vpa    text NOT NULL,
  amount_paise integer NOT NULL CHECK (amount_paise > 0),
  status       text NOT NULL CHECK (status IN ('PENDING', 'SETTLED', 'FAILED', 'REFUNDED')),
  rrn          text UNIQUE,         -- UPI retrieval reference number, set on settlement
  created_at   timestamptz NOT NULL DEFAULT now(),
  settled_at   timestamptz
);

-- The bank's statement: one credit line per UPI payment received.
CREATE TABLE IF NOT EXISTS bank_lines (
  id             text PRIMARY KEY,  -- BNK-20-04
  statement_date date NOT NULL,
  amount_paise   integer NOT NULL,
  rrn            text,              -- some PSPs drop it from the narration
  posted_at      timestamptz NOT NULL,
  narration      text NOT NULL
);
