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
import type { Category } from "@shahrim/api-client";
import tokens from "@shahrim/ui-tokens";
import { compressImage } from "./lib/image";

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
  const [photoError, setPhotoError] = useState<string | null>(null);

  // Description + category
  const [description, setDescription] = useState("");
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

      setPhotoError(null);
      setPhotoUrl(null);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });

      setUploading(true);
      try {
        const compressed = await compressImage(file);
        const { photo_url } = await client.uploadPhoto(compressed);
        setPhotoUrl(photo_url);
      } catch {
        setPhotoError(t("report_error"));
      } finally {
        setUploading(false);
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
        urgency: null,
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
  }, [client, photoUrl, description, categoryCode, lat, lng, t]);

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
          ← {t("back")}
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
                {uploading && (
                  <div className="sh-photo__overlay" role="status">
                    <span className="sh-spinner" aria-hidden="true" />
                    <span style={{ fontSize: tokens.fontSize.sm }}>
                      {t("uploading")}
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
                  📷
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
                    style={{ borderRadius: tokens.radius.md, fontSize: tokens.fontSize.base }}
                  >
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
