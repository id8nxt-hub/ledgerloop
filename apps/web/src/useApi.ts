import { useEffect, useState } from "react";

// Loads data once per key. Returns [data, error].
export function useApi<T>(load: () => Promise<T>, key = ""): [T | null, string | null] {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    setData(null);
    load()
      .then((d) => live && setData(d))
      .catch((e: Error) => live && setError(`Could not reach the LedgerLoop API (${e.message}). Is pnpm dev running?`));
    return () => {
      live = false;
    };
  }, [key]);
  return [data, error];
}
