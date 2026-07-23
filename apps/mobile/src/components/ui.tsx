/**
 * Small themed building blocks shared across screens. All colour/spacing/radii/
 * type come from the (light-only) theme; no hardcoded palette. Text content is
 * always passed in by callers (Uzbek via i18n). The visual language mirrors the
 * bright Mini App: white rounded cards with a soft cool shadow, a cobalt primary
 * button with a glow, quiet white secondary buttons, and soft-tinted status
 * badges with a colour-matched dot.
 */
import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import type { StyleProp, ViewStyle, TextStyle } from "react-native";
import { useTranslation } from "react-i18next";
import type { IssueStatus } from "@shahrim/api-client";
import { useTheme } from "../theme";
import { STATUS_KEY } from "../lib/status";

export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: t.color.card,
          borderRadius: t.radius.lg,
          borderWidth: 1,
          borderColor: t.color.border,
          padding: t.space[5],
          gap: t.space[3],
        },
        t.cardShadow,
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Title({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
}) {
  const t = useTheme();
  return (
    <Text
      style={[
        {
          color: t.color.text,
          fontSize: t.fontSize.xl,
          fontFamily: t.font.display,
          letterSpacing: -0.3,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function Subtitle({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
}) {
  const t = useTheme();
  return (
    <Text
      style={[
        { color: t.color.muted, fontSize: t.fontSize.base, fontFamily: t.font.medium },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function Meta({
  children,
  style,
  numberOfLines,
}: {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}) {
  const t = useTheme();
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        { color: t.color.muted, fontSize: t.fontSize.sm, fontFamily: t.font.medium },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

type ButtonVariant = "primary" | "secondary";

export function Button({
  title,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const isPrimary = variant === "primary";
  const bg = isPrimary ? t.color.primary : t.color.card;
  const fg = isPrimary ? t.color.primaryText : t.color.text;
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          backgroundColor: bg,
          borderRadius: t.radius.lg,
          borderWidth: isPrimary ? 0 : 1.5,
          borderColor: t.color.border,
          paddingVertical: t.space[4],
          paddingHorizontal: t.space[6],
          alignItems: "center",
          justifyContent: "center",
          minHeight: 56,
          transform: [{ translateY: pressed && !isDisabled ? 1 : 0 }],
          opacity: isDisabled ? 0.5 : 1,
        },
        // Only the primary button carries the cobalt glow.
        isPrimary && !isDisabled ? t.primaryShadow : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text
          style={{
            color: fg,
            fontSize: t.fontSize.lg,
            fontFamily: isPrimary ? t.font.bold : t.font.semibold,
          }}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

export function Loading({ label }: { label?: string }) {
  const t = useTheme();
  return (
    <View style={{ alignItems: "center", gap: t.space[3], padding: t.space[8] }}>
      <ActivityIndicator size="large" color={t.color.accent} />
      {label ? <Meta>{label}</Meta> : null}
    </View>
  );
}

export function ErrorView({
  message,
  onRetry,
  retryLabel,
}: {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  const t = useTheme();
  return (
    <Card style={{ alignItems: "center" }}>
      <Text
        style={{
          color: t.color.text,
          fontSize: t.fontSize.base,
          fontFamily: t.font.medium,
          textAlign: "center",
        }}
      >
        {message}
      </Text>
      {onRetry && retryLabel ? (
        <Button title={retryLabel} variant="secondary" onPress={onRetry} />
      ) : null}
    </Card>
  );
}

/** Soft-tinted status badge: pale background + colour-matched dot & label. */
export function StatusBadge({ status }: { status: IssueStatus }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const c = theme.color;
  const tone: Record<IssueStatus, { fg: string; bg: string }> = {
    submitted: { fg: c.dim, bg: c.line },
    in_review: { fg: c.primary, bg: c.primarySoft },
    in_progress: { fg: c.med, bg: c.medSoft },
    resolved: { fg: c.low, bg: c.lowSoft },
    rejected: { fg: c.high, bg: c.highSoft },
  };
  const { fg, bg } = tone[status];
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: bg,
        borderRadius: theme.radius.pill,
        paddingVertical: 5,
        paddingHorizontal: theme.space[3],
        alignSelf: "flex-start",
      }}
    >
      <View
        style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: fg }}
      />
      <Text
        style={{
          color: fg,
          fontSize: theme.fontSize.xs,
          fontFamily: theme.font.bold,
        }}
      >
        {t(STATUS_KEY[status])}
      </Text>
    </View>
  );
}
