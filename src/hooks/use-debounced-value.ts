import { useEffect, useState } from "react";

/**
 * Returns `value` after it has been stable for `delayMs`. Useful for expensive
 * derivations (like re-rendering a PDF) where the upstream changes every
 * keystroke but the consumer only needs to react once the user pauses.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}
