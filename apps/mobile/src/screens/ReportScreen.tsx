import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import type { Category, Urgency } from "@shahrim/api-client";
import { ApiError } from "@shahrim/api-client";
import { client, uploadPhotoAsset } from "../api";
import { SAMARKAND } from "../config";
import { useTheme } from "../theme";
import { Button, Card, Loading, Meta, Subtitle, Title } from "../components/ui";
import { ErrorBoundary } from "../components/ErrorBoundary";

const MapPicker = lazy(() => import("../components/MapPicker"));

const CATEGORY_CODES = [
  "road_damage",
  "street_light",
  "garbage",
  "water_leak",
  "sewage",
  "damaged_sign",
  "fallen_tree",
  "public_transport",
  "other",
] as const;

const DEFAULT_CATEGORY = "other";
const URGENCIES: Urgency[] = ["low", "medium", "high"];

/**
 * Report flow (PRD §6.2), mirroring the Mini App's ReportFlow as one scrollable
 * screen: pick/take a photo → upload → AI analysis (suggestion chips + category
 * + urgency + validity) → editable description → category → location (draggable
 * map with a coords-only fallback) → submit → success.
 */
export function ReportScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();

  // Photo
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  // Description + category + urgency
  const [description, setDescription] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [urgency, setUrgency] = useState<Urgency>("medium");
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryCode, setCategoryCode] = useState<string>(DEFAULT_CATEGORY);

  // Location
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [usedFallback, setUsedFallback] = useState(false);
  const locationRequested = useRef(false);

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);

  // Categories (with local Uzbek fallback if the request fails).
  useEffect(() => {
    let alive = true;
    client
      .listCategories()
      .then((cats) => {
        if (alive && cats.length > 0) setCategories(cats);
      })
      .catch(() => {
        /* fall back below */
      });
    return () => {
      alive = false;
    };
  }, []);

  const fallbackCategories = useMemo<Category[]>(
    () =>
      CATEGORY_CODES.map((code) => ({ code, name_uz: t(`cat_${code}`), icon: null })),
    [t],
  );
  const shownCategories = categories.length > 0 ? categories : fallbackCategories;

  const requestLocation = useCallback(async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLat(SAMARKAND.lat);
        setLng(SAMARKAND.lng);
        setUsedFallback(true);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLat(pos.coords.latitude);
      setLng(pos.coords.longitude);
      setUsedFallback(false);
    } catch {
      setLat(SAMARKAND.lat);
      setLng(SAMARKAND.lng);
      setUsedFallback(true);
    } finally {
      setLocating(false);
    }
  }, []);

  // Grab the current position once, on mount.
  useEffect(() => {
    if (locationRequested.current) return;
    locationRequested.current = true;
    void requestLocation();
  }, [requestLocation]);

  const processAsset = useCallback(
    async (uri: string) => {
      // Fresh photo resets any prior analysis.
      setPhotoError(null);
      setPhotoUrl(null);
      setSuggestions([]);
      setCategoryCode(DEFAULT_CATEGORY);
      setPreviewUri(uri);

      setUploading(true);
      let uploadedUrl: string | null = null;
      try {
        const { photo_url } = await uploadPhotoAsset(uri);
        uploadedUrl = photo_url;
        setPhotoUrl(photo_url);
      } catch {
        setPhotoError(t("report_error"));
      } finally {
        setUploading(false);
      }
      if (!uploadedUrl) return;

      // AI analysis (PRD §8): never blocks the report — any failure = "no
      // analysis" and the citizen types their own description.
      setAnalyzing(true);
      try {
        const result = await client.analyzePhoto(uploadedUrl);
        if (!result.is_valid_city_issue) {
          setPhotoUrl(null);
          setPhotoError(t("retake_photo"));
        } else {
          setSuggestions(
            Array.isArray(result.suggestions) ? result.suggestions.slice(0, 2) : [],
          );
          if (result.category) setCategoryCode(result.category);
          if (result.urgency) setUrgency(result.urgency);
        }
      } catch {
        /* AI unavailable — proceed without suggestions */
      } finally {
        setAnalyzing(false);
      }
    },
    [t],
  );

  const pickFromCamera = useCallback(async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t("permission_needed"), t("camera_permission_denied"));
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
    });
    if (!res.canceled && res.assets[0]) await processAsset(res.assets[0].uri);
  }, [processAsset, t]);

  const pickFromGallery = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t("permission_needed"), t("gallery_permission_denied"));
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
    });
    if (!res.canceled && res.assets[0]) await processAsset(res.assets[0].uri);
  }, [processAsset, t]);

  const onMarkerChange = useCallback((nextLat: number, nextLng: number) => {
    setLat(nextLat);
    setLng(nextLng);
    setUsedFallback(false);
  }, []);

  const submit = useCallback(async () => {
    if (!photoUrl) {
      setPhotoError(t("photo_required"));
      return;
    }
    if (lat == null || lng == null) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await client.createIssue({
        photo_url: photoUrl,
        user_description: description.trim(),
        category_code: categoryCode,
        urgency,
        lat,
        lng,
        address_text: null,
      });
      setSucceeded(true);
    } catch (err) {
      setSubmitError(
        err instanceof ApiError && err.message ? err.message : t("report_error"),
      );
    } finally {
      setSubmitting(false);
    }
  }, [photoUrl, lat, lng, description, categoryCode, urgency, t]);

  if (succeeded) {
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
        <Card style={{ alignItems: "center" }}>
          <Title style={{ color: theme.color.accent, fontSize: theme.fontSize["3xl"] }}>
            ✓
          </Title>
          <Title style={{ textAlign: "center" }}>{t("submitted_success")}</Title>
          <Button title={t("done")} onPress={() => router.replace("/home")} />
        </Card>
      </ScrollView>
    );
  }

  const busy = uploading || analyzing;

  return (
    <ScrollView
      contentContainerStyle={{
        padding: theme.space[6],
        gap: theme.space[6],
        backgroundColor: theme.color.bg,
      }}
      keyboardShouldPersistTaps="handled"
    >
      {/* Photo */}
      <View style={{ gap: theme.space[3] }}>
        <Title>{t("report_problem")}</Title>
        {previewUri ? (
          <View style={{ gap: theme.space[3] }}>
            <View
              style={{
                borderRadius: theme.radius.lg,
                overflow: "hidden",
                backgroundColor: theme.color.border,
              }}
            >
              <Image
                source={{ uri: previewUri }}
                style={{ width: "100%", height: 240 }}
                resizeMode="cover"
              />
              {busy ? (
                <View
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: 0,
                    bottom: 0,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "rgba(0,0,0,0.45)",
                  }}
                >
                  <Loading label={uploading ? t("uploading") : t("analyzing")} />
                </View>
              ) : null}
            </View>
            <View style={{ flexDirection: "row", gap: theme.space[3] }}>
              <Button
                title={t("camera")}
                variant="secondary"
                onPress={() => void pickFromCamera()}
                style={{ flex: 1 }}
              />
              <Button
                title={t("gallery")}
                variant="secondary"
                onPress={() => void pickFromGallery()}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        ) : (
          <View style={{ gap: theme.space[3] }}>
            <Button title={t("camera")} onPress={() => void pickFromCamera()} />
            <Button
              title={t("gallery")}
              variant="secondary"
              onPress={() => void pickFromGallery()}
            />
          </View>
        )}
        {photoError ? (
          <Meta style={{ color: theme.color.danger }}>{photoError}</Meta>
        ) : null}
      </View>

      {/* Description + AI suggestions */}
      <View style={{ gap: theme.space[3] }}>
        <Subtitle style={{ color: theme.color.text, fontWeight: "600" }}>
          {t("describe_problem")}
        </Subtitle>
        {suggestions.length > 0 ? (
          <View style={{ gap: theme.space[2] }}>
            <Meta>{t("ai_suggestions")}</Meta>
            <View style={{ gap: theme.space[2] }}>
              {suggestions.map((s, i) => {
                const selected = description === s;
                return (
                  <Pressable
                    key={i}
                    onPress={() => setDescription(s)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={{
                      borderWidth: 1.5,
                      borderColor: selected ? theme.color.accent : theme.color.border,
                      backgroundColor: selected ? theme.color.accent : theme.color.card,
                      borderRadius: theme.radius.md,
                      padding: theme.space[3],
                    }}
                  >
                    <Meta
                      style={{
                        color: selected ? theme.color.onAccent : theme.color.text,
                        fontSize: theme.fontSize.base,
                      }}
                    >
                      {s}
                    </Meta>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder={t("or_type_your_own")}
          placeholderTextColor={theme.color.muted}
          multiline
          numberOfLines={4}
          style={{
            minHeight: 100,
            borderWidth: 1,
            borderColor: theme.color.border,
            borderRadius: theme.radius.md,
            padding: theme.space[3],
            color: theme.color.text,
            fontSize: theme.fontSize.base,
            backgroundColor: theme.color.card,
            textAlignVertical: "top",
          }}
        />
        <Meta>{t("optional")}</Meta>
      </View>

      {/* Category */}
      <View style={{ gap: theme.space[3] }}>
        <Subtitle style={{ color: theme.color.text, fontWeight: "600" }}>
          {t("category")}
        </Subtitle>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.space[2] }}>
          {shownCategories.map((cat) => {
            const selected = cat.code === categoryCode;
            return (
              <Pressable
                key={cat.code}
                onPress={() => setCategoryCode(cat.code)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={{
                  borderWidth: 1.5,
                  borderColor: selected ? theme.color.primary : theme.color.border,
                  backgroundColor: selected ? theme.color.primary : theme.color.card,
                  borderRadius: theme.radius.md,
                  paddingVertical: theme.space[2],
                  paddingHorizontal: theme.space[3],
                }}
              >
                <Meta
                  style={{
                    color: selected ? theme.color.primaryText : theme.color.text,
                    fontSize: theme.fontSize.sm,
                  }}
                >
                  {cat.name_uz}
                </Meta>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Urgency */}
      <View style={{ gap: theme.space[3] }}>
        <Subtitle style={{ color: theme.color.text, fontWeight: "600" }}>
          {t("urgency")}
        </Subtitle>
        <View style={{ flexDirection: "row", gap: theme.space[2] }}>
          {URGENCIES.map((u) => {
            const selected = urgency === u;
            const c = theme.urgencyColor[u];
            return (
              <Pressable
                key={u}
                onPress={() => setUrgency(u)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={{
                  flex: 1,
                  alignItems: "center",
                  borderWidth: 2,
                  borderColor: c,
                  backgroundColor: selected ? c : "transparent",
                  borderRadius: theme.radius.md,
                  paddingVertical: theme.space[3],
                }}
              >
                <Meta
                  style={{
                    color: selected ? "#FFFFFF" : theme.color.text,
                    fontSize: theme.fontSize.sm,
                    fontWeight: "600",
                  }}
                >
                  {t(`urgency_${u}`)}
                </Meta>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Location */}
      <View style={{ gap: theme.space[3] }}>
        <Subtitle style={{ color: theme.color.text, fontWeight: "600" }}>
          {t("location")}
        </Subtitle>
        {locating || lat == null || lng == null ? (
          <Loading label={t("getting_location")} />
        ) : (
          <>
            <ErrorBoundary
              fallback={
                <Card>
                  <Meta>{t("map_unavailable")}</Meta>
                  <Meta style={{ color: theme.color.text, fontSize: theme.fontSize.base }}>
                    {t("coordinates")}: {lat.toFixed(5)}, {lng.toFixed(5)}
                  </Meta>
                  <Button
                    title={t("use_current_location")}
                    variant="secondary"
                    onPress={() => void requestLocation()}
                  />
                </Card>
              }
            >
              <Suspense fallback={<Loading />}>
                <MapPicker lat={lat} lng={lng} onChange={onMarkerChange} />
              </Suspense>
            </ErrorBoundary>
            <Meta>{usedFallback ? t("select_on_map") : t("location_hint")}</Meta>
            <Meta style={{ color: theme.color.text }}>
              {t("coordinates")}: {lat.toFixed(5)}, {lng.toFixed(5)}
            </Meta>
            <Button
              title={t("use_current_location")}
              variant="secondary"
              onPress={() => void requestLocation()}
            />
          </>
        )}
      </View>

      {submitError ? (
        <Meta style={{ color: theme.color.danger }}>{submitError}</Meta>
      ) : null}

      <Button
        title={submitting ? t("sending") : t("submit")}
        onPress={() => void submit()}
        loading={submitting}
        disabled={busy || lat == null || lng == null}
      />
    </ScrollView>
  );
}

export default ReportScreen;
