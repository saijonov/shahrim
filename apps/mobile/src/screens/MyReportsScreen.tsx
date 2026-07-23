import { useCallback, useEffect, useState } from "react";
import { Image, Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import type { Issue } from "@shahrim/api-client";
import { client } from "../api";
import { photoSrc } from "../config";
import { useTheme } from "../theme";
import { formatDate } from "../lib/status";
import {
  Card,
  ErrorView,
  Loading,
  Meta,
  StatusBadge,
  Title,
} from "../components/ui";

type Phase = "loading" | "error" | "ready";

/**
 * "Mening murojaatlarim" (PRD §6.3): the citizen's own reports, newest first,
 * as tappable cards (thumbnail, title, category, status badge, date) with
 * loading / error (retry) / empty states — all Uzbek.
 */
export function MyReportsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("loading");
  const [issues, setIssues] = useState<Issue[]>([]);

  const load = useCallback(() => {
    let alive = true;
    setPhase("loading");
    client
      .listMyIssues()
      .then((list) => {
        if (!alive) return;
        setIssues(list);
        setPhase("ready");
      })
      .catch(() => {
        if (alive) setPhase("error");
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => load(), [load]);

  return (
    <ScrollView
      contentContainerStyle={{
        padding: theme.space[6],
        gap: theme.space[5],
        backgroundColor: theme.color.bg,
        flexGrow: 1,
      }}
    >
      <Title>{t("my_reports")}</Title>

      {phase === "loading" ? <Loading label={t("loading")} /> : null}

      {phase === "error" ? (
        <ErrorView message={t("load_error")} onRetry={load} retryLabel={t("retry")} />
      ) : null}

      {phase === "ready" && issues.length === 0 ? (
        <Card style={{ alignItems: "center", paddingVertical: theme.space[10] }}>
          <Meta style={{ fontSize: theme.fontSize.lg }}>{t("no_reports_yet")}</Meta>
        </Card>
      ) : null}

      {phase === "ready" && issues.length > 0 ? (
        <View style={{ gap: theme.space[3] }}>
          {issues.map((issue) => (
            <IssueCard
              key={issue.id}
              issue={issue}
              onPress={() => router.push(`/issue/${issue.id}`)}
            />
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

function IssueCard({ issue, onPress }: { issue: Issue; onPress: () => void }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const categoryName = t(`cat_${issue.category_code}`);
  const title =
    issue.final_description?.trim() ||
    issue.user_description?.trim() ||
    categoryName;
  const thumb = photoSrc(issue.photo_url);

  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      <Card
        style={{
          flexDirection: "row",
          gap: theme.space[3],
          alignItems: "center",
          padding: theme.space[3],
        }}
      >
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: theme.radius.md,
            overflow: "hidden",
            backgroundColor: theme.color.primarySoft,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {thumb ? (
            <Image source={{ uri: thumb }} style={{ width: 64, height: 64 }} />
          ) : (
            <Meta
              style={{ fontSize: theme.fontSize.xs, color: theme.color.primary }}
            >
              {t("no_photo")}
            </Meta>
          )}
        </View>
        <View style={{ flex: 1, gap: theme.space[1] }}>
          <Meta
            style={{
              color: theme.color.text,
              fontSize: theme.fontSize.base,
              fontFamily: theme.font.display,
            }}
            numberOfLines={2}
          >
            {title}
          </Meta>
          <Meta style={{ fontSize: theme.fontSize.sm }}>{categoryName}</Meta>
          <View
            style={{
              flexDirection: "row",
              gap: theme.space[2],
              alignItems: "center",
            }}
          >
            <StatusBadge status={issue.status} />
            <Meta style={{ fontSize: theme.fontSize.xs }}>
              {formatDate(issue.created_at)}
            </Meta>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

export default MyReportsScreen;
