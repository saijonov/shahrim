import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { createClient } from "@shahrim/api-client";
import type { User } from "@shahrim/api-client";
import tokens from "@shahrim/ui-tokens";
import { ReportFlow } from "./ReportFlow";
import { MyReports } from "./MyReports";
import { IssueDetail } from "./IssueDetail";
import "./i18n";

type Phase = "init" | "no_telegram" | "loading" | "error" | "ready";
type Screen = "home" | "report" | "history" | "detail";

const TOKEN_KEY = "shahrim_token";

export function App() {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>("init");
  const [user, setUser] = useState<User | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [screen, setScreen] = useState<Screen>("home");
  const [selectedIssueId, setSelectedIssueId] = useState<number | null>(null);

  const runAuth = useCallback(async () => {
    setNotice(null);
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
    }

    // Raw, signed init data — the only thing the backend trusts. Empty when the
    // page is opened in a plain browser during local dev.
    const initData = tg?.initData;
    if (!initData) {
      setPhase("no_telegram");
      return;
    }

    setPhase("loading");
    try {
      const client = createClient({
        baseUrl: import.meta.env.VITE_API_BASE || "/api",
        getToken: () => localStorage.getItem(TOKEN_KEY),
      });
      const auth = await client.authTelegram(initData);
      localStorage.setItem(TOKEN_KEY, auth.access_token);
      setUser(auth.user);
      setPhase("ready");
    } catch {
      setPhase("error");
    }
  }, []);

  useEffect(() => {
    void runAuth();
  }, [runAuth]);

  return (
    <div className="sh-app">
      <div className="sh-topbar" aria-hidden="true" />
      <main
        className="sh-main"
        style={{ padding: tokens.space[6], gap: tokens.space[6] }}
      >
        <header className="sh-brandrow" style={{ gap: tokens.space[3] }}>
          <span className="sh-tile" aria-hidden="true" />
          <h1
            className="sh-wordmark"
            style={{
              fontFamily: tokens.font.display,
              fontSize: tokens.fontSize["2xl"],
            }}
          >
            {t("app_name")}
          </h1>
        </header>

        {renderBody()}
      </main>
    </div>
  );

  function renderBody() {
    if (phase === "no_telegram") {
      return (
        <section
          className="sh-card sh-card--notice"
          style={{
            padding: tokens.space[6],
            borderRadius: tokens.radius.lg,
            gap: tokens.space[3],
          }}
        >
          <span className="sh-emoji" aria-hidden="true">
            ✈️
          </span>
          <p className="sh-notice-text" style={{ fontSize: tokens.fontSize.lg }}>
            {t("open_in_telegram")}
          </p>
        </section>
      );
    }

    if (phase === "error") {
      return (
        <section
          className="sh-card"
          style={{
            padding: tokens.space[6],
            borderRadius: tokens.radius.lg,
            gap: tokens.space[4],
          }}
        >
          <p style={{ fontSize: tokens.fontSize.lg }}>{t("auth_failed")}</p>
          <button
            type="button"
            className="sh-btn sh-btn--secondary"
            style={{
              padding: `${tokens.space[4]}px ${tokens.space[6]}px`,
              borderRadius: tokens.radius.lg,
              fontSize: tokens.fontSize.lg,
            }}
            onClick={() => void runAuth()}
          >
            {t("retry")}
          </button>
        </section>
      );
    }

    if (phase === "ready") {
      if (screen === "report") {
        return <ReportFlow onExit={() => setScreen("home")} />;
      }

      if (screen === "history") {
        return (
          <MyReports
            onExit={() => setScreen("home")}
            onOpen={(id) => {
              setSelectedIssueId(id);
              setScreen("detail");
            }}
          />
        );
      }

      if (screen === "detail" && selectedIssueId != null) {
        return (
          <IssueDetail
            id={selectedIssueId}
            onExit={() => setScreen("history")}
          />
        );
      }

      const firstName = user?.first_name?.trim();
      return (
        <>
          <section
            className="sh-card"
            style={{
              padding: tokens.space[6],
              borderRadius: tokens.radius.lg,
              gap: tokens.space[2],
            }}
          >
            <p
              className="sh-greeting"
              style={{ fontSize: tokens.fontSize.xl }}
            >
              {firstName
                ? t("greeting", { name: firstName })
                : t("greeting_noname")}
            </p>
            {user?.phone ? (
              <p className="sh-meta" style={{ fontSize: tokens.fontSize.sm }}>
                {t("phone_label")}: {user.phone}
              </p>
            ) : null}
          </section>

          <div className="sh-actions" style={{ gap: tokens.space[4] }}>
            <button
              type="button"
              className="sh-btn sh-btn--primary"
              style={{
                padding: `${tokens.space[5]}px ${tokens.space[6]}px`,
                borderRadius: tokens.radius.lg,
                fontSize: tokens.fontSize.lg,
              }}
              onClick={() => {
                setNotice(null);
                setScreen("report");
              }}
            >
              {t("report_problem")}
            </button>
            <button
              type="button"
              className="sh-btn sh-btn--secondary"
              style={{
                padding: `${tokens.space[5]}px ${tokens.space[6]}px`,
                borderRadius: tokens.radius.lg,
                fontSize: tokens.fontSize.lg,
              }}
              onClick={() => {
                setNotice(null);
                setScreen("history");
              }}
            >
              {t("my_reports")}
            </button>
          </div>

          {notice ? (
            <p
              className="sh-meta sh-notice-inline"
              role="status"
              style={{ fontSize: tokens.fontSize.sm }}
            >
              {notice}
            </p>
          ) : null}
        </>
      );
    }

    // "init" and "loading" share the same calm loading state.
    return (
      <div
        className="sh-center"
        style={{ gap: tokens.space[4], padding: tokens.space[8] }}
      >
        <span className="sh-spinner" aria-hidden="true" />
        <p className="sh-meta" style={{ fontSize: tokens.fontSize.base }}>
          {t("loading")}
        </p>
      </div>
    );
  }
}
