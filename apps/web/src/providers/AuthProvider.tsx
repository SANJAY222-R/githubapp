import { createContext, useContext, useEffect, useState } from "react";
import { http } from "../lib/http.js";
import type { SessionUserSchema } from "@gitclone/shared";
import type { z } from "zod";

type SessionUser = z.infer<typeof SessionUserSchema>;

type AuthContextValue = {
  user: SessionUser | null;
  loading: boolean;
  refetch: () => void;
};

const AuthContext = createContext<AuthContextValue>({ user: null, loading: true, refetch: () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = () => {
    setLoading(true);
    http.get<SessionUser>("/me")
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetch(); }, []);

  return <AuthContext.Provider value={{ user, loading, refetch: fetch }}>{children}</AuthContext.Provider>;
}

export function useAuth() { return useContext(AuthContext); }
