# Data for the Site tickets

The first Issue to Impact tickets don't need this repository cloned. Codex builds a small app from a
brief, loads one of these files and deploys it as a Site. Codex can download a file straight from its
raw link:

| File | Raw link | Used by |
| --- | --- | --- |
| `invoices.json` | https://raw.githubusercontent.com/id8nxt-hub/ledgerloop/main/sites/invoices.json | Invoice ledger with a database (back end) |
| `payments.json` | https://raw.githubusercontent.com/id8nxt-hub/ledgerloop/main/sites/payments.json | Payments board (front end) |

The uptime board (DevOps) needs no file: it watches `https://api.codexxing.id8devhub.com/v1/health`,
which is always up, and `https://api.codexxing.id8devhub.com/v1/health/down`, which is always down.

All data is synthetic and the same as LedgerLoop's demo data. Money is integer paise
(100 paise = ₹1). The GST rule is LedgerLoop's money rule 3 (see `AGENTS.md`): for each GST rate on an
invoice, add up the taxable value of its lines at that rate, apply the rate once and round half up to
the paisa. Never round line by line.
