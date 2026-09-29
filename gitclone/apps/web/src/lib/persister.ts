import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";

export const persister = createSyncStoragePersister({ storage: window.localStorage });

export function wipeClientData(): void {
  try {
    window.localStorage.clear();
    window.sessionStorage.clear();
    if ("indexedDB" in window && typeof indexedDB.databases === "function") {
      indexedDB.databases().then((dbs) => {
        for (const db of dbs) {
          if (db.name) {
            indexedDB.deleteDatabase(db.name);
          }
        }
      }).catch(() => {});
    }
  } catch {
    // Ignore in non-browser or sandbox environments
  }
}
