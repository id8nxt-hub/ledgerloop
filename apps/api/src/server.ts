import { createServer } from "node:http";
import { createHandler } from "./app.ts";
import { openDb } from "./db.ts";

const port = Number(process.env.PORT ?? 5100);
// In memory by default: every start is a fresh copy of the demo data.
// Set LEDGERLOOP_DATA_DIR to keep data between runs.
const db = await openDb({ dataDir: process.env.LEDGERLOOP_DATA_DIR });

createServer(createHandler(db)).listen(port, () => {
  console.log(`LedgerLoop API on http://localhost:${port}/api/health`);
});
