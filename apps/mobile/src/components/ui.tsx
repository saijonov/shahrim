/**
 * Small themed building blocks shared across screens. All colour/spacing/radii
 * come from the theme (ui-tokens); no hardcoded palette. Text content is always
 * passed in by callers (Uzbek via i18n).
 */
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { StyleProp, ViewStyle, TextStyle } from "react-native";
import { useTranslation } from "react-i18next";
import type { IssueStatus } from "@shahrim/api-client";
import { useTheme } from "../theme";
import { STATUS_COLOR, STATUS_KEY } from "../lib/status";

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
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: t.color.border,
          padding: t.space[5],
          gap: t.space[3],
        },
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
        { color: t.color.text, fontSize: t.fontSize.xl, fontWeight: "700" },
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
    <Text style={[{ color: t.color.muted, fontSize: t.fontSize.base }, style]}>
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
      style={[{ color: t.color.muted, fontSize: t.fontSize.sm }, style]}
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
  const bg = isPrimary ? t.color.primary : "transparent";
  const fg = isPrimary ? t.color.primaryText : t.color.primary;
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
          borderWidth: isPrimary ? 0 : 2,
          borderColor: t.color.primary,
          paddingVertical: t.space[4],
          paddingHorizontal: t.space[6],
          alignItems: "center",
          justifyContent: "center",
          minHeight: 56,
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={{ color: fg, fontSize: t.fontSize.lg, fontWeight: "600" }}>
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
      <ActivityIndicator size="large" color={t.color.primary} />
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

export function StatusBadge({ status }: { status: IssueStatus }) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <View
      style={{
        backgroundColor: STATUS_COLOR[status],
        borderRadius: theme.radius.pill,
        paddingVertical: theme.space[1],
        paddingHorizontal: theme.space[3],
        alignSelf: "flex-start",
      }}
    >
      <Text
        style={{
          color: "#FFFFFF",
          fontSize: theme.fontSize.xs,
          fontWeight: "600",
        }}
      >
        {t(STATUS_KEY[status])}
      </Text>
    </View>
  );
}
