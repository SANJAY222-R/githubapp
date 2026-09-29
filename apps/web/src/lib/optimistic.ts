import { queryClient } from "./queryClient.js";

export function optimisticUpdate<T>(
  queryKey: unknown[],
  updater: (old: T | undefined) => T
): () => void {
  const previous = queryClient.getQueryData<T>(queryKey);
  queryClient.setQueryData<T>(queryKey, updater);
  return () => queryClient.setQueryData<T>(queryKey, previous);
}
