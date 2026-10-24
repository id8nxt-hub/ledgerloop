# LedgerLoop

A small, synthetic invoicing and payments app for an Indian SaaS business, built as the sandbox
for **Issue to Impact**. You work its GitHub issues with Codex: each one is a real-looking bug in
GST invoices, UPI payments or bank reconciliation. All data is synthetic.

## Run it

You need Node.js 26 and pnpm 11 (`npm install -g pnpm@11`, or `corepack enable`).
The same two commands work on Windows, macOS and Linux:

```sh
pnpm i
pnpm dev
```

- Settlement dashboard: http://localhost:5173
- Hosted checkout (mock UPI): http://localhost:5174/?invoice=INV-2026-0187
- API: http://localhost:5100/api/health

Run the tests with `pnpm test`, the type checker with `pnpm typecheck`, and `pnpm doctor` if
something will not start.

## Layout

```
packages/ledger   money, GST and rounding (integer paise)
apps/api          ledger service on Node with embedded Postgres (PGlite): invoices, credit notes,
                  UPI payments, reconciliation, reports
apps/web          React + Vite settlement dashboard and payments screens
apps/checkout     hosted checkout page with a mock UPI app
tests             the visible test suite (node:test)
```

## Tickets

Tickets are GitHub issues labelled by `stack`, `level`, `domain` and `tier`. Each names a base tag
to start from, for example `git switch -c fix/41 t1-base`. Read `AGENTS.md` before you start: it
has the money rules the code is supposed to follow.

MIT licensed. Not a real product; do not use it to bill anyone.
