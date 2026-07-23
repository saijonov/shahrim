import { useCallback, useEffect, useMemo, useState } from "react";
import { createAdminClient, getToken, clearToken, setUnauthorizedHandler } from "./api";
import type { AdminUser } from "./api";
import { Login } from "./Login";
import { Dashboard } from "./Dashboard";
import { Spinner } from "./ui";
import spriteMarkup from "./assets/sprite.svg?raw";
import "./i18n";

type Phase = "booting" | "unauthed" | "authed";

/**
 * Auth guard + top-level router (PRD §7). On boot: if a token exists, validate
 * it with /admin/me; otherwise show the login page. Any admin request that
 * returns 401 (via the api-layer interceptor) drops the token and returns here.
 */
export function App() {
  const api = useMemo(() => createAdminClient(), []);
  const [phase, setPhase] = useState<Phase>("booting");
  const [admin, setAdmin] = useState<AdminUser | null>(null);

  const logout = useCallback(() => {
    clearToken();
    setAdmin(null);
    setPhase("unauthed");
  }, []);

  // Wire the global 401 handler so an expired session anywhere logs out.
  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  // Boot: validate an existing token, otherwise go straight to login.
  useEffect(() => {
    if (!getToken()) {
      setPhase("unauthed");
      return;
    }
    let alive = true;
    api
      .me()
      .then((me) => {
        if (!alive) return;
        setAdmin(me);
        setPhase("authed");
      })
      .catch(() => {
        // A 401 already cleared the token via the interceptor; any other error
        // also falls back to the login screen.
        if (alive) {
          clearToken();
          setPhase("unauthed");
        }
      });
    return () => {
      alive = false;
    };
  }, [api]);

  // The shared SVG sprite (logo + icons) is injected once so any screen can
  // reference its symbols via <use>. It is purely decorative / offscreen.
  return (
    <>
      <div
        className="adm-sprite"
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: spriteMarkup }}
      />
      {renderScreen()}
    </>
  );

  function renderScreen() {
    if (phase === "booting") {
      return (
        <div className="adm-app">
          <div className="adm-topbar" aria-hidden="true" />
          <Spinner />
        </div>
      );
    }

    if (phase === "authed" && admin) {
      return <Dashboard adminName={admin.first_name || admin.email} onLogout={logout} />;
    }

    return (
      <Login
        onSuccess={(me) => {
          setAdmin(me);
          setPhase("authed");
        }}
      />
    );
  }
}

export default App;
