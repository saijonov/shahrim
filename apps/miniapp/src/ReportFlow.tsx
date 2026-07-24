import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { createClient, ApiError } from "@shahrim/api-client";
import type { Category, Urgency } from "@shahrim/api-client";
import tokens from "@shahrim/ui-tokens";
import { compressImage } from "./lib/image";
import { Icon } from "./components/Icon";
import { categoryIcon } from "./lib/categoryIcons";

// Leaflet is heavy and touches the DOM at import time, so the map is code-split
// and only loaded once the citizen reaches the location step. This also keeps
// it out of the auth-shell import chain (App stays light).
const LocationMap = lazy(() =>
  import("./LocationMap").then((m) => ({ default: m.LocationMap })),
);

const TOKEN_KEY = "shahrim_token";

// Samarkand old town — the graceful fallback when geolocation is denied or
// unavailable (PRD §5). The citizen can then drag the pin to the right spot.
const SAMARKAND: readonly [number, number] = [39.6542, 66.9597];

// Category codes seeded by the backend (PRD §9); used to build a local fallback
// list (all Uzbek, via i18n) if the /categories request ever fails, so the flow
// never dead-ends.
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

const STEPS = ["photo", "description", "category", "location"] as const;
type StepId = (typeof STEPS)[number];

export interface ReportFlowProps {
  /** Return to the home screen (back out of / finish the flow). */
  onExit: () => void;
}

export function ReportFlow({ onExit }: ReportFlowProps) {
  const { t } = useTranslation();

  const client = useMemo(
    () =>
      createClient({
        baseUrl: import.meta.env.VITE_API_BASE || "/api",
        getToken: () => localStorage.getItem(TOKEN_KEY),
      }),
    [],
  );

  const [stepIndex, setStepIndex] = useState(0);
  const step: StepId = STEPS[stepIndex];

  // Photo
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  // Description + category
  const [description, setDescription] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [urgency, setUrgency] = useState<Urgency | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryCode, setCategoryCode] = useState<string>(DEFAULT_CATEGORY);

  // Location
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [usedFallbackLocation, setUsedFallbackLocation] = useState(false);
  const locationRequested = useRef(false);

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch categories once; fall back to a local Uzbek list if the call fails.
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
  }, [client]);

  const fallbackCategories = useMemo<Category[]>(
    () =>
      CATEGORY_CODES.map((code) => ({
        code,
        name_uz: t(`cat_${code}`),
        icon: null,
      })),
    [t],
  );
  const shownCategories = categories.length > 0 ? categories : fallbackCategories;

  // Revoke the object URL when a new preview replaces it / on unmount.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const onPickFile = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      // Allow re-selecting the same file next time.
      event.target.value = "";
      if (!file) return;

      // A fresh photo resets any prior analysis so stale chips/urgency/category
      // never leak into a new report.
      setPhotoError(null);
      setPhotoUrl(null);
      setSuggestions([]);
      setUrgency(null);
      setCategoryCode(DEFAULT_CATEGORY);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });

      setUploading(true);
      let uploadedUrl: string | null = null;
      try {
        const compressed = await compressImage(file);
        const { photo_url } = await client.uploadPhoto(compressed);
        uploadedUrl = photo_url;
        setPhotoUrl(photo_url);
      } catch {
        setPhotoError(t("report_error"));
      } finally {
        setUploading(false);
      }

      if (!uploadedUrl) return;

      // AI analysis (PRD §8): suggestions + category + urgency + validity.
      // Non-blocking — the backend never hard-errors this, but any failure here
      // is treated as "no analysis" so the citizen can always type and submit.
      setAnalyzing(true);
      try {
        const result = await client.analyzePhoto(uploadedUrl);
        if (!result.is_valid_city_issue) {
          // Not a city problem — require a retake (clear photoUrl so "Next" is
          // blocked) and explain why, in Uzbek. Kept friendly, not punitive.
          setPhotoUrl(null);
          setPhotoError(t("retake_photo"));
        } else {
          const sugg = Array.isArray(result.suggestions)
            ? result.suggestions.slice(0, 2)
            : [];
          setSuggestions(sugg);
          // Auto-fill the description with the AI's top suggestion so the citizen
          // needn't type anything (still fully editable). Don't clobber user input.
          if (sugg.length > 0) {
            setDescription((prev) => (prev.trim() ? prev : sugg[0]));
          }
          // Backend guarantees a valid code (defaults to "other") — auto-selected.
          if (result.category) setCategoryCode(result.category);
          setUrgency(result.urgency ?? null);
        }
      } catch {
        // AI unavailable — proceed with no suggestions; user types their own.
      } finally {
        setAnalyzing(false);
      }
    },
    [client, t],
  );

  // Request the current position the first time the location step opens.
  useEffect(() => {
    if (step !== "location" || locationRequested.current) return;
    locationRequested.current = true;

    if (!("geolocation" in navigator)) {
      setLat(SAMARKAND[0]);
      setLng(SAMARKAND[1]);
      setUsedFallbackLocation(true);
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setUsedFallbackLocation(false);
        setLocating(false);
      },
      () => {
        // Denied / unavailable → drop the pin on Samarkand for manual placement.
        setLat(SAMARKAND[0]);
        setLng(SAMARKAND[1]);
        setUsedFallbackLocation(true);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  }, [step]);

  const goNext = useCallback(() => {
    if (step === "photo" && !photoUrl) {
      setPhotoError(t("photo_required"));
      return;
    }
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }, [step, photoUrl, t]);

  const goBack = useCallback(() => {
    if (stepIndex === 0) {
      onExit();
      return;
    }
    setStepIndex((i) => Math.max(i - 1, 0));
  }, [stepIndex, onExit]);

  const onMarkerChange = useCallback((nextLat: number, nextLng: number) => {
    setLat(nextLat);
    setLng(nextLng);
  }, []);

  const submit = useCallback(async () => {
    if (!photoUrl || lat == null || lng == null) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await client.createIssue({
        photo_url: photoUrl,
        user_description: description.trim(),
        category_code: categoryCode,
        urgency: urgency ?? "medium",
        lat,
        lng,
        address_text: null,
      });
      setSucceeded(true);
    } catch (err) {
      const msg =
        err instanceof ApiError && err.message ? err.message : t("report_error");
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  }, [client, photoUrl, description, categoryCode, urgency, lat, lng, t]);

  const pad6 = tokens.space[6];

  if (succeeded) {
    return (
      <section
        className="sh-card sh-card--notice sh-success"
        style={{ padding: pad6, borderRadius: tokens.radius.lg, gap: tokens.space[4] }}
      >
        <span className="sh-success__mark" aria-hidden="true">
          ✓
        </span>
        <p className="sh-notice-text" style={{ fontSize: tokens.fontSize.xl }}>
          {t("submitted_success")}
        </p>
        <button
          type="button"
          className="sh-btn sh-btn--primary"
          style={{
            padding: `${tokens.space[5]}px ${pad6}px`,
            borderRadius: tokens.radius.lg,
            fontSize: tokens.fontSize.lg,
          }}
          onClick={onExit}
        >
          {t("done")}
        </button>
      </section>
    );
  }

  return (
    <div className="sh-flow" style={{ gap: tokens.space[5] }}>
      {/* Header: back + step indicator */}
      <div className="sh-flow__head" style={{ gap: tokens.space[3] }}>
        <button
          type="button"
          className="sh-linkbtn"
          onClick={goBack}
          aria-label={t("back")}
        >
          <Icon id="ic-back" size={18} />
          {t("back")}
        </button>
        <ol className="sh-steps" aria-hidden="true">
          {STEPS.map((s, i) => (
            <li
              key={s}
              className={
                "sh-steps__dot" +
                (i === stepIndex ? " is-active" : "") +
                (i < stepIndex ? " is-done" : "")
              }
            />
          ))}
        </ol>
      </div>

      <section
        className="sh-card sh-flow__body"
        style={{ padding: pad6, borderRadius: tokens.radius.lg, gap: tokens.space[4] }}
      >
        {step === "photo" && (
          <div className="sh-step" style={{ gap: tokens.space[4] }}>
            <h2 className="sh-step__title" style={{ fontSize: tokens.fontSize.lg }}>
              {t("report_problem")}
            </h2>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="sh-visually-hidden"
              onChange={(e) => void onPickFile(e)}
              data-testid="photo-input"
            />

            {previewUrl ? (
              <div className="sh-photo">
                <img className="sh-photo__img" src={previewUrl} alt="" />
                {(uploading || analyzing) && (
                  <div className="sh-photo__overlay" role="status">
                    <span className="sh-spinner" aria-hidden="true" />
                    <span style={{ fontSize: tokens.fontSize.sm }}>
                      {uploading ? t("uploading") : t("analyzing")}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                className="sh-dropzone"
                onClick={() => fileInputRef.current?.click()}
              >
                <span className="sh-dropzone__icon" aria-hidden="true">
                  {/* Inline (not sprite <use>) so it always renders in the
                      Telegram iOS webview, with an explicit cobalt fill. */}
                  <svg width={42} height={42} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path
                      d="M9.2 3.5c-.5 0-1 .3-1.2.8L7.2 6H4.5A2.5 2.5 0 0 0 2 8.5v9A2.5 2.5 0 0 0 4.5 20h15a2.5 2.5 0 0 0 2.5-2.5v-9A2.5 2.5 0 0 0 19.5 6h-2.7l-.8-1.7c-.2-.5-.7-.8-1.2-.8H9.2Z"
                      fill="var(--co-primary, #143C8C)"
                    />
                    <circle cx="12" cy="13" r="4" fill="#ffffff" />
                    <circle cx="12" cy="13" r="2" fill="var(--co-primary, #143C8C)" />
                  </svg>
                </span>
                <span style={{ fontSize: tokens.fontSize.lg }}>
                  {t("add_photo")}
                </span>
              </button>
            )}

            {previewUrl && (
              <button
                type="button"
                className="sh-btn sh-btn--secondary"
                style={{ borderRadius: tokens.radius.lg, fontSize: tokens.fontSize.base }}
                onClick={() => fileInputRef.current?.click()}
              >
                {t("retake")}
              </button>
            )}

            {photoError && (
              <p className="sh-error" role="alert" style={{ fontSize: tokens.fontSize.sm }}>
                {photoError}
              </p>
            )}
          </div>
        )}

        {step === "description" && (
          <div className="sh-step" style={{ gap: tokens.space[3] }}>
            <h2 className="sh-step__title" style={{ fontSize: tokens.fontSize.lg }}>
              {t("describe_problem")}
            </h2>

            {suggestions.length > 0 && (
              <div className="sh-suggests" style={{ gap: tokens.space[2] }}>
                <div className="sh-suggests__head">
                  <Icon id="ic-star" size={18} />
                  <p className="sh-meta" style={{ fontSize: tokens.fontSize.sm }}>
                    {t("ai_suggestions")}
                  </p>
                </div>
                <div className="sh-suggests__list" style={{ gap: tokens.space[2] }}>
                  {suggestions.map((suggestion, i) => (
                    <button
                      key={i}
                      type="button"
                      className={
                        "sh-suggest" +
                        (description === suggestion ? " is-selected" : "")
                      }
                      aria-pressed={description === suggestion}
                      onClick={() => setDescription(suggestion)}
                      style={{ fontSize: tokens.fontSize.base }}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <textarea
              className="sh-textarea"
              rows={5}
              value={description}
              placeholder={t("or_type_your_own")}
              onChange={(e) => setDescription(e.target.value)}
              aria-label={t("describe_problem")}
              style={{ fontSize: tokens.fontSize.base, borderRadius: tokens.radius.md }}
            />
            <p className="sh-meta" style={{ fontSize: tokens.fontSize.sm }}>
              {t("optional")}
            </p>
          </div>
        )}

        {step === "category" && (
          <div className="sh-step" style={{ gap: tokens.space[3] }}>
            <h2 className="sh-step__title" style={{ fontSize: tokens.fontSize.lg }}>
              {t("category")}
            </h2>
            <div className="sh-catgrid" style={{ gap: tokens.space[2] }}>
              {shownCategories.map((cat) => {
                const selected = cat.code === categoryCode;
                return (
                  <button
                    key={cat.code}
                    type="button"
                    className={"sh-chip" + (selected ? " is-selected" : "")}
                    aria-pressed={selected}
                    onClick={() => setCategoryCode(cat.code)}
                    style={{ borderRadius: tokens.radius.lg }}
                  >
                    <Icon
                      id={categoryIcon(cat.code)}
                      size={28}
                      className="sh-chip__icon"
                    />
                    {cat.name_uz}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === "location" && (
          <div className="sh-step" style={{ gap: tokens.space[3] }}>
            <h2 className="sh-step__title" style={{ fontSize: tokens.fontSize.lg }}>
              {t("location")}
            </h2>
            {locating || lat == null || lng == null ? (
              <div className="sh-center" style={{ gap: tokens.space[3], padding: tokens.space[8] }}>
                <span className="sh-spinner" aria-hidden="true" />
                <p className="sh-meta" style={{ fontSize: tokens.fontSize.base }}>
                  {t("getting_location")}
                </p>
              </div>
            ) : (
              <>
                <Suspense
                  fallback={
                    <div className="sh-center" style={{ padding: tokens.space[8] }}>
                      <span className="sh-spinner" aria-hidden="true" />
                    </div>
                  }
                >
                  <LocationMap lat={lat} lng={lng} onChange={onMarkerChange} />
                </Suspense>
                <p className="sh-meta" style={{ fontSize: tokens.fontSize.sm }}>
                  {usedFallbackLocation ? t("select_on_map") : t("location_hint")}
                </p>
              </>
            )}
          </div>
        )}
      </section>

      {/* Footer action */}
      <div className="sh-flow__foot">
        {step === "location" ? (
          <>
            {submitError && (
              <p className="sh-error" role="alert" style={{ fontSize: tokens.fontSize.sm }}>
                {submitError}
              </p>
            )}
            <button
              type="button"
              className="sh-btn sh-btn--primary"
              style={{
                padding: `${tokens.space[5]}px ${pad6}px`,
                borderRadius: tokens.radius.lg,
                fontSize: tokens.fontSize.lg,
              }}
              disabled={submitting || lat == null || lng == null}
              onClick={() => void submit()}
            >
              {!submitting && <Icon id="ic-send" size={21} />}
              {submitting ? t("sending") : t("submit")}
            </button>
          </>
        ) : (
          <button
            type="button"
            className="sh-btn sh-btn--primary"
            style={{
              padding: `${tokens.space[5]}px ${pad6}px`,
              borderRadius: tokens.radius.lg,
              fontSize: tokens.fontSize.lg,
            }}
            disabled={uploading}
            onClick={goNext}
          >
            {t("next")}
          </button>
        )}
      </div>
    </div>
  );
}

export default ReportFlow;
