const inFlight = new Map<string, Promise<unknown>>();

/**
 * Coalesces concurrent in-flight executions for the same key
 * so only one fetch is executed upstream while all callers await the shared result.
 */
export async function singleFlight<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const existing = inFlight.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  const promise = (async () => {
    try {
      return await fetcher();
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, promise);
  return promise;
}

export function getInFlightCount(): number {
  return inFlight.size;
}

export function clearInFlight(): void {
  inFlight.clear();
}
