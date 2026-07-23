import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import type { User } from "@shahrim/api-client";
import { ApiError } from "@shahrim/api-client";
import { client } from "./api";
import { tokenStore } from "./tokenStore";

type Status = "loading" | "signed_out" | "signed_in";

interface AuthState {
  status: Status;
  user: User | null;
  /** Persist a freshly-obtained token + user and move to the signed-in state. */
  signIn: (token: string, user: User) => Promise<void>;
  /** Clear the token and return to the login screen. */
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [user, setUser] = useState<User | null>(null);

  // On startup: hydrate the token cache, then confirm it by fetching /me.
  useEffect(() => {
    let alive = true;
    (async () => {
      const token = await tokenStore.load();
      if (!token) {
        if (alive) setStatus("signed_out");
        return;
      }
      try {
        const me = await client.me();
        if (!alive) return;
        setUser(me);
        setStatus("signed_in");
      } catch (err) {
        // A 401 means the stored token is stale — drop it. Other (network)
        // errors also fall back to signed-out; the user can retry the login.
        if (err instanceof ApiError && err.status === 401) {
          await tokenStore.clear();
        }
        if (alive) setStatus("signed_out");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const signIn = useCallback(async (token: string, nextUser: User) => {
    await tokenStore.set(token);
    setUser(nextUser);
    setStatus("signed_in");
  }, []);

  const signOut = useCallback(async () => {
    await tokenStore.clear();
    setUser(null);
    setStatus("signed_out");
  }, []);

  const value = useMemo<AuthState>(
    () => ({ status, user, signIn, signOut }),
    [status, user, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
