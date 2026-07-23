import { useCallback, useEffect, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { IssueDetail, RatingInfo } from "@shahrim/api-client";
import { client } from "../api";
import { photoSrc } from "../config";
import { useTheme } from "../theme";
import { STATUS_KEY, formatDateTime } from "../lib/status";
import {
  Button,
  Card,
  ErrorView,
  Loading,
  Meta,
  StatusBadge,
  Subtitle,
  Title,
} from "../components/ui";

type Phase = "loading" | "error" | "ready";

/**
 * Single-report detail (PRD §6.3): photo, description, category, urgency,
 * location, a status timeline, the city's result photo + note when resolved,
 * and the rating widget (PRD §6.4) for resolved reports.
 */
export function IssueDetailScreen({ id }: { id: number }) {
  const { t } = useTranslation();
  const theme = useTheme();

  const [phase, setPhase] = useState<Phase>("loading");
  const [issue, setIssue] = useState<IssueDetail | null>(null);

  const load = useCallback(() => {
    let alive = true;
    setPhase("loading");
    client
      .getIssue(id)
      .then((data) => {
        if (!alive) return;
        setIssue(data);
        setPhase("ready");
      })
      .catch(() => {
        if (alive) setPhase("error");
      });
    return () => {
      alive = false;
    };
  }, [id]);

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
      {phase === "loading" ? <Loading label={t("loading")} /> : null}
      {phase === "error" ? (
        <ErrorView message={t("load_error")} onRetry={load} retryLabel={t("retry")} />
      ) : null}
      {phase === "ready" && issue ? <Body issue={issue} /> : null}
    </ScrollView>
  );
}

function Body({ issue }: { issue: IssueDetail }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const categoryName = t(`cat_${issue.category_code}`);
  const description =
    issue.final_description?.trim() || issue.user_description?.trim() || "";
  const photo = photoSrc(issue.photo_url);
  const resultPhoto = photoSrc(issue.resolution?.result_photo_url);

  // Timeline newest-first so the current status reads at the top.
  const timeline = useMemo(
    () =>
      [...issue.status_history].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
    [issue.status_history],
  );

  return (
    <View style={{ gap: theme.space[5] }}>
      <View
        style={{
          borderRadius: theme.radius.xl,
          overflow: "hidden",
          backgroundColor: theme.color.card2,
          borderWidth: 1,
          borderColor: theme.color.border,
          alignItems: "center",
          justifyContent: "center",
          minHeight: 200,
        }}
      >
        {photo ? (
          <Image
            source={{ uri: photo }}
            style={{ width: "100%", height: 240 }}
            resizeMode="cover"
          />
        ) : (
          <Meta>{t("no_photo")}</Meta>
        )}
      </View>

      <StatusBadge status={issue.status} />

      {description ? (
        <Subtitle style={{ color: theme.color.text, fontSize: theme.fontSize.lg }}>
          {description}
        </Subtitle>
      ) : null}

      <Card>
        <FactRow label={t("category")} value={categoryName} />
        {issue.urgency ? (
          <FactRow label={t("urgency")} value={t(`urgency_${issue.urgency}`)} />
        ) : null}
        {issue.lat != null && issue.lng != null ? (
          <FactRow
            label={t("location")}
            value={`${issue.lat.toFixed(5)}, ${issue.lng.toFixed(5)}`}
          />
        ) : null}
        {issue.address_text ? (
          <FactRow label={t("location")} value={issue.address_text} />
        ) : null}
      </Card>

      {/* Resolution — the city's result photo + note (green-tinted). */}
      {issue.resolution ? (
        <Card
          style={{ backgroundColor: theme.color.lowSoft, borderColor: theme.color.low }}
        >
          <Title style={{ fontSize: theme.fontSize.lg }}>{t("result_photo")}</Title>
          {resultPhoto ? (
            <View style={{ borderRadius: theme.radius.md, overflow: "hidden" }}>
              <Image
                source={{ uri: resultPhoto }}
                style={{ width: "100%", height: 200 }}
                resizeMode="cover"
              />
            </View>
          ) : null}
          {issue.resolution.note ? (
            <Meta style={{ color: theme.color.text, fontSize: theme.fontSize.base }}>
              {issue.resolution.note}
            </Meta>
          ) : null}
        </Card>
      ) : null}

      {/* Rating (PRD §6.4) — only for resolved issues. */}
      {issue.status === "resolved" ? <RatingSection issue={issue} /> : null}

      {/* Status timeline (newest first) — a cobalt thread of dots. */}
      {timeline.length > 0 ? (
        <Card>
          <Title style={{ fontSize: theme.fontSize.lg }}>{t("timeline")}</Title>
          <View style={{ gap: 0 }}>
            {timeline.map((entry, i) => {
              const last = i === timeline.length - 1;
              return (
                <View
                  key={i}
                  style={{ flexDirection: "row", gap: theme.space[3] }}
                >
                  {/* Left rail: dot + connective line down to the next item. */}
                  <View style={{ width: 14, alignItems: "center" }}>
                    <View
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 6,
                        marginTop: 4,
                        backgroundColor: theme.color.primary,
                        borderWidth: 3,
                        borderColor: theme.color.bg,
                      }}
                    />
                    {!last ? (
                      <View
                        style={{
                          flex: 1,
                          width: 2,
                          marginTop: 2,
                          backgroundColor: theme.color.border,
                        }}
                      />
                    ) : null}
                  </View>
                  <View
                    style={{
                      flex: 1,
                      gap: theme.space[1],
                      paddingBottom: last ? 0 : theme.space[4],
                    }}
                  >
                    <Meta
                      style={{
                        color: theme.color.text,
                        fontSize: theme.fontSize.base,
                        fontFamily: theme.font.bold,
                      }}
                    >
                      {t(STATUS_KEY[entry.status])}
                    </Meta>
                    <Meta style={{ fontSize: theme.fontSize.xs }}>
                      {formatDateTime(entry.created_at)}
                    </Meta>
                    {entry.note ? (
                      <Meta style={{ fontSize: theme.fontSize.sm }}>{entry.note}</Meta>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        </Card>
      ) : null}
    </View>
  );
}

function FactRow({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: theme.space[3] }}>
      <Meta>{label}</Meta>
      <Meta
        style={{ color: theme.color.text, fontSize: theme.fontSize.base, flexShrink: 1, textAlign: "right" }}
      >
        {value}
      </Meta>
    </View>
  );
}

/**
 * Rating widget. Interactive 1–5 stars + optional comment when the resolved
 * report is unrated; read-only once rated (or right after submitting).
 */
function RatingSection({ issue }: { issue: IssueDetail }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [rating, setRating] = useState<RatingInfo | null>(issue.rating);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);

  const submit = useCallback(() => {
    if (stars < 1 || sending) return;
    setSending(true);
    setFailed(false);
    client
      .rateIssue(issue.id, { stars, comment: comment.trim() || null })
      .then((info) => {
        setRating(info);
        setJustSubmitted(true);
      })
      .catch(() => setFailed(true))
      .finally(() => setSending(false));
  }, [issue.id, stars, comment, sending]);

  if (rating) {
    return (
      <Card style={{ backgroundColor: theme.color.card2 }}>
        <Title style={{ fontSize: theme.fontSize.lg }}>
          {justSubmitted ? t("thank_you") : t("your_rating")}
        </Title>
        <StarRow value={rating.stars} />
        {rating.comment ? (
          <Meta style={{ color: theme.color.text, fontSize: theme.fontSize.base }}>
            {rating.comment}
          </Meta>
        ) : null}
      </Card>
    );
  }

  return (
    <Card style={{ backgroundColor: theme.color.card2 }}>
      <Title style={{ fontSize: theme.fontSize.lg }}>{t("rate_resolution")}</Title>
      <StarRow value={stars} onChange={setStars} disabled={sending} />
      <TextInput
        value={comment}
        onChangeText={setComment}
        placeholder={t("leave_comment")}
        placeholderTextColor={theme.color.muted}
        editable={!sending}
        multiline
        style={{
          minHeight: 80,
          borderWidth: 1.5,
          borderColor: theme.color.border,
          borderRadius: theme.radius.md,
          padding: theme.space[4],
          color: theme.color.text,
          fontSize: theme.fontSize.base,
          fontFamily: theme.font.body,
          backgroundColor: theme.color.field,
          textAlignVertical: "top",
        }}
      />
      {failed ? (
        <Meta style={{ color: theme.color.danger }}>{t("rating_error")}</Meta>
      ) : null}
      <Button
        title={sending ? t("sending") : t("submit")}
        onPress={submit}
        loading={sending}
        disabled={stars < 1}
      />
    </Card>
  );
}

function StarRow({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange?: (n: number) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const readOnly = !onChange;
  return (
    <View
      accessibilityRole={readOnly ? "image" : undefined}
      accessibilityLabel={readOnly ? t("star_aria", { n: value }) : undefined}
      style={{ flexDirection: "row", gap: theme.space[1] }}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = value >= n;
        const star = (
          <Text
            style={{
              fontSize: readOnly ? 26 : 34,
              lineHeight: readOnly ? 32 : 40,
              color: filled ? theme.color.gold : theme.color.border,
            }}
          >
            {filled ? "★" : "☆"}
          </Text>
        );
        if (readOnly) return <View key={n}>{star}</View>;
        return (
          <Pressable
            key={n}
            disabled={disabled}
            onPress={() => onChange?.(n)}
            accessibilityRole="button"
            accessibilityLabel={t("star_aria", { n })}
            accessibilityState={{ selected: filled }}
          >
            {star}
          </Pressable>
        );
      })}
    </View>
  );
}

export default IssueDetailScreen;
