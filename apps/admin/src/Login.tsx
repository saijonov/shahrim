import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import tokens from "@shahrim/ui-tokens";
import { createAdminClient, isUnauthorized, setToken } from "./api";
import type { AdminUser } from "./api";

export interface LoginProps {
  /** Called with the authenticated admin once login succeeds. */
  onSuccess: (admin: AdminUser) => void;
}

/**
 * Admin login (PRD §7): email + password → POST /admin/auth/login. On success
 * the JWT is stored and the app enters the dashboard. A 401 is bad credentials
 * (shown inline in Uzbek); anything else is a generic error.
 */
export function Login({ onSuccess }: LoginProps) {
  const { t } = useTranslation();
  const api = useMemo(() => createAdminClient(), []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const res = await api.login(email.trim(), password);
      setToken(res.access_token);
      onSuccess(res.admin);
    } catch (err) {
      setError(isUnauthorized(err) ? t("invalid_login") : t("login_error"));
      setBusy(false);
    }
  }

  return (
    <div className="adm-app">
      <div className="adm-topbar" aria-hidden="true" />
      <main className="adm-login">
        <form className="adm-login__card" onSubmit={handleSubmit}>
          <div className="adm-brandrow" style={{ gap: tokens.space[3] }}>
            <span className="adm-tile" aria-hidden="true" />
            <div>
              <h1
                className="adm-wordmark"
                style={{ fontFamily: tokens.font.display, fontSize: tokens.fontSize.xl }}
              >
                {t("app_name")}
              </h1>
              <p className="adm-muted" style={{ fontSize: tokens.fontSize.sm }}>
                {t("admin_dashboard")}
              </p>
            </div>
          </div>

          <h2 className="adm-login__title" style={{ fontSize: tokens.fontSize.lg }}>
            {t("login")}
          </h2>

          <label className="adm-field">
            <span className="adm-field__label">{t("email")}</span>
            <input
              className="adm-input"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label className="adm-field">
            <span className="adm-field__label">{t("password")}</span>
            <input
              className="adm-input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          {error ? (
            <p className="adm-error" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            className="adm-btn adm-btn--primary"
            disabled={busy}
            style={{ marginTop: tokens.space[2] }}
          >
            {busy ? t("loading") : t("sign_in")}
          </button>
        </form>
      </main>
    </div>
  );
}

export default Login;
