import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { queryClient } from "../lib/queryClient.js";
import { persister } from "../lib/persister.js";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
      {children}
    </PersistQueryClientProvider>
  );
}
