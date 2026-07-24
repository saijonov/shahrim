import { useCallback, useEffect, useRef, useState } from "react";
import { Image, Linking, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import * as Crypto from "expo-crypto";
import type { AuthResponse } from "@shahrim/api-client";
import { ApiError } from "@shahrim/api-client";
import { client } from "../api";
import { BOT_USERNAME } from "../config";
import { buildTelegramLoginUrl } from "../auth-url";
import { useAuth } from "../AuthContext";
import { useTheme } from "../theme";
import { Button, Card, Loading, Meta, Subtitle } from "../components/ui";

const POLL_INTERVAL_MS = 2000;
// ~4 minutes of polling before giving up and offering a retry.
const MAX_ATTEMPTS = 120;

type Phase = "idle" | "waiting" | "error";

/**
 * Onboarding + native login (PRD §5 native path). We mint a random nonce, open
 * the Telegram bot with `?start=login_<nonce>`, and poll /auth/native/exchange
 * until the bot binds the nonce to the user (who shares their phone in Telegram)
 * — a 404 means "still pending", a 200 returns the session token + user.
 */
export function LoginScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const { signIn } = useAuth();

  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState<string | null>(null);

  // Poll bookkeeping kept in refs so the interval closure stays stable.
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const attemptsRef = useRef(0);
  const nonceRef = useRef<string | null>(null);
  const busyRef = useRef(false);

  const stopPolling = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const poll = useCallback(async () => {
    const nonce = nonceRef.current;
    if (!nonce || busyRef.current) return;
    busyRef.current = true;
    attemptsRef.current += 1;

    try {
      const auth = await client.request<AuthResponse>("/auth/native/exchange", {
        method: "POST",
        body: JSON.stringify({ nonce }),
      });
      stopPolling();
      await signIn(auth.access_token, auth.user);
      router.replace("/home");
      return;
    } catch (err) {
      // 404 = not yet confirmed → keep polling. Anything else we tolerate as a
      // transient blip and keep trying until the attempt budget runs out.
      const pending = err instanceof ApiError && err.status === 404;
      if (!pending && !(err instanceof ApiError)) {
        // network error — tolerate silently
      }
      if (attemptsRef.current >= MAX_ATTEMPTS) {
        stopPolling();
        setPhase("error");
        setMessage(t("login_timeout"));
      }
    } finally {
      busyRef.current = false;
    }
  }, [router, signIn, stopPolling, t]);

  const start = useCallback(async () => {
    stopPolling();
    setMessage(null);
    attemptsRef.current = 0;
    const nonce = Crypto.randomUUID();
    nonceRef.current = nonce;

    try {
      const url = buildTelegramLoginUrl(BOT_USERNAME, nonce);
      await Linking.openURL(url);
    } catch {
      setPhase("error");
      setMessage(t("login_failed"));
      return;
    }

    setPhase("waiting");
    // Kick off polling; the first tick fires after the interval so Telegram has
    // a moment to open.
    timerRef.current = setInterval(() => {
      void poll();
    }, POLL_INTERVAL_MS);
  }, [poll, stopPolling, t]);

  const openTelegramAgain = useCallback(() => {
    const nonce = nonceRef.current;
    if (!nonce) return;
    void Linking.openURL(buildTelegramLoginUrl(BOT_USERNAME, nonce));
  }, []);

  return (
    <ScrollView
      contentContainerStyle={{
        padding: theme.space[6],
        gap: theme.space[6],
        flexGrow: 1,
        justifyContent: "center",
        backgroundColor: theme.color.bg,
      }}
    >
      <View style={{ gap: theme.space[4] }}>
        <Image
          source={require("../assets/logo-full.png")}
          style={{ width: 220, height: 195 }}
          resizeMode="contain"
          accessibilityLabel={t("app_name")}
        />
        <View style={{ gap: theme.space[2] }}>
          <Subtitle
            style={{
              fontSize: theme.fontSize.lg,
              color: theme.color.text,
              fontFamily: theme.font.semibold,
            }}
          >
            {t("onboarding_title")}
          </Subtitle>
          <Meta style={{ fontSize: theme.fontSize.base }}>{t("onboarding_body")}</Meta>
        </View>
      </View>

      {phase === "waiting" ? (
        <Card style={{ alignItems: "center" }}>
          <Loading label={t("waiting_for_telegram")} />
          <Meta style={{ textAlign: "center" }}>{t("waiting_hint")}</Meta>
          <Button
            title={t("open_telegram")}
            variant="secondary"
            onPress={openTelegramAgain}
          />
        </Card>
      ) : (
        <View style={{ gap: theme.space[4] }}>
          {message ? (
            <Meta style={{ color: theme.color.danger, textAlign: "center" }}>
              {message}
            </Meta>
          ) : null}
          <Button title={t("login_with_telegram")} onPress={() => void start()} />
        </View>
      )}
    </ScrollView>
  );
}

export default LoginScreen;
