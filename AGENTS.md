# LedgerLoop: notes for coding agents (and people)

LedgerLoop is a synthetic invoicing and payments app for an Indian SaaS business: GST invoices,
credit notes, UPI payments, bank reconciliation, a settlement dashboard and a hosted checkout.
Every company, GSTIN, UPI ID and reference number in it is made up. It is the sandbox for the
Issue to Impact programme: each GitHub issue is a ticket, and each ticket names a base tag.

## Commands

| Command | What it does |
| --- | --- |
| `pnpm i` | Install (Node 26, pnpm 11). Works the same on Windows, macOS and Linux. |
| `pnpm dev` | API on :5100, dashboard on http://localhost:5173, checkout on http://localhost:5174 |
| `pnpm test` | The visible test suite (`node:test`, files in `tests/`) |
| `pnpm test:invoicing` | Money, GST, invoice and credit note tests |
| `pnpm test:api` | API tests: invoices, checkout, payments, reports (in process, no port opened) |
| `pnpm test:reconciliation` | Reconciliation tests |
| `pnpm typecheck` | TypeScript, no emit |
| `pnpm doctor` | Checks Node, pnpm, ports and tags |
| `node --test tests/invoice.test.ts` | Run one test file |

The API keeps its Postgres (PGlite, embedded) in memory: every `pnpm dev` starts from the same demo
data. Set `LEDGERLOOP_DATA_DIR=.data` to keep data between runs.

## Where things are

- `packages/ledger/src/` money, GST and rounding. `money.ts` (paise helpers), `gst.ts` (rates,
  `gstOn`), `invoice.ts` (`invoiceTotals`: line items to total), `credit-note.ts`
  (`creditNoteTotals`), `payments.ts` (the ledger's payment statuses).
- `apps/api/src/` the ledger service. `server.ts` and `app.ts` (routes), `db.ts` and `schema.sql`,
  `seed.ts` (demo data), `invoices.ts`, `payments/` (history, mock UPI), `reconciliation/`
  (`reconcile.ts` is the matching logic, `job.ts` loads a day from the database),
  `reports/settlement-report.ts`.
- `apps/web/src/` the React dashboard. `pages/` (Settlement, Payments, Invoices),
  `components/PaymentStatusBadge.tsx`, `api.ts` (typed fetches).
- `apps/checkout/` the hosted checkout page with a mock UPI app.
- `tests/` the visible suite. Hidden checks for tickets live elsewhere and test behaviour.

## Money rules

1. Money is an integer number of paise everywhere inside the system (`Paise` in `money.ts`).
   Rupees with decimals only at the edges: parsing input and `formatINR` for display.
2. No floating point arithmetic on money. Use `divideRoundHalfUp` for any division.
3. GST is computed once per rate: sum the taxable value of all lines at that rate, apply the rate,
   round half up to the paisa. Never round line by line and then add the rounded amounts.
4. Invoices and credit notes follow the same rules and must agree with each other.
5. Payment statuses come from the ledger (`PAYMENT_STATUSES` in `packages/ledger/src/payments.ts`).
   Screens show what the ledger says; they do not invent statuses.
6. The same input must always give the same output. No result may depend on the order rows arrive
   in, the time of day, or randomness.

## How to work here

- Start from the ticket's base tag: `git switch -c fix/41 t1-base`.
- Reproduce first: write a failing test (or open the page in the browser) before changing code.
- Keep the change small and in the module the ticket is about. Run the tests for the area you
  changed (`pnpm test:invoicing`, `pnpm test:api` or `pnpm test:reconciliation`), then `pnpm test`
  and `pnpm typecheck`, before you call it done.
- TypeScript runs directly on Node (type stripping): write `.ts` extensions in imports, use
  `import type` for types, and no enums, namespaces or parameter properties.
- Do not commit `node_modules`, `.data/` or build output.

## Known issues

- Open issue #43: "reconciles the 20 Oct statement in full" in `tests/reconciliation.test.ts`
  fails now and then on unchanged code. If you are working on another ticket and it is the only
  failure in `pnpm test`, your change did not cause it: say so in your summary and leave it to #43.
