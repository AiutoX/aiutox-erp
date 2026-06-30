/**
 * FieldFormRenderer — field-mode wrapper around FormRenderer.
 *
 * - Loads form schema from Dexie (offline-first, no network required)
 * - Applies field-mode CSS overrides via `.field-mode` class (64px+ touch targets, lg font)
 * - Delegates submit to useOfflineSubmit (online POST or offline Dexie queue)
 * - Passes encryptionPublicKeyPem when form has E2E encryption enabled
 * - Supports one-question-per-screen mode toggle
 */

import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FormRenderer,
  type RenderFieldOverride,
} from "~/features/data_collection/components/renderer/FormRenderer";
import { useOfflineSubmit } from "~/features/data_collection/hooks/useOfflineSubmit";
import { fieldDb, type StoredFieldFormQueueItem } from "../../lib/field-db";
import { useFieldTranslation } from "../../i18n/useFieldTranslation";
import { OneQuestionMode } from "./OneQuestionMode";
import { ScanButton } from "../scanner/ScanButton";
import { GPSField } from "../location/GPSField";

type SubmitState = "idle" | "success" | "error";

// ── Field-mode render overrides ───────────────────────────────────────────────

/**
 * Builds the renderField override for field-mode forms.
 * - text / number: wraps input + ScanButton in a flex row
 * - location: replaces with GPSField (auto-GPS capture + manual fallback)
 * Returns null for all other types → FormRenderer uses its default rendering.
 */
function makeFieldRenderOverride(disabled: boolean): RenderFieldOverride {
  const FieldRenderOverride: RenderFieldOverride = (field, value, setValue) => {
    if (field.type === "location") {
      return (
        <GPSField
          field={field}
          value={value}
          onChange={setValue}
          disabled={disabled}
        />
      );
    }

    if (field.type === "text" || field.type === "number") {
      const inputType = field.type === "number" ? "number" : "text";
      const inputMode =
        field.type === "number" ? ("decimal" as const) : ("text" as const);
      return (
        <div className="space-y-1">
          <label
            className="block text-sm font-medium text-foreground"
            htmlFor={field.id}
          >
            {field.label}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </label>
          <div className="flex gap-2">
            <input
              id={field.id}
              type={inputType}
              inputMode={inputMode}
              disabled={disabled}
              value={
                typeof value === "string" || typeof value === "number"
                  ? String(value)
                  : ""
              }
              onChange={(e) =>
                setValue(
                  field.type === "number"
                    ? e.target.valueAsNumber
                    : e.target.value
                )
              }
              placeholder={
                typeof field.placeholder === "string" ? field.placeholder : ""
              }
              className="flex-1 min-h-[64px] rounded-xl border border-input bg-background px-3 py-2 text-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            />
            <ScanButton
              disabled={disabled}
              onScan={(scanned) =>
                setValue(field.type === "number" ? Number(scanned) : scanned)
              }
            />
          </div>
        </div>
      );
    }

    return null;
  };
  return FieldRenderOverride;
}

export function FieldFormRenderer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useFieldTranslation();
  const { submit, isSubmitting } = useOfflineSubmit();

  const [stored, setStored] = useState<StoredFieldFormQueueItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [oneQuestionMode, setOneQuestionMode] = useState(
    () => localStorage.getItem("field_one_question") === "true"
  );

  useEffect(() => {
    if (!id) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    void fieldDb.formQueue
      .where("formId")
      .equals(id)
      .first()
      .then((item) => {
        if (!item) {
          setNotFound(true);
        } else {
          setStored(item);
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = useCallback(
    async (values: Record<string, unknown>) => {
      if (!id) return;
      setSubmitState("idle");
      try {
        await submit({ formId: id, data: values });
        setSubmitState("success");
      } catch {
        setSubmitState("error");
      }
    },
    [id, submit]
  );

  function toggleOneQuestion() {
    const next = !oneQuestionMode;
    setOneQuestionMode(next);
    localStorage.setItem("field_one_question", String(next));
  }

  // ── Loading skeleton ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="px-4 py-6 space-y-4">
        <div className="h-7 w-48 animate-pulse rounded bg-muted" />
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
        <div className="h-16 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  // ── Not found ────────────────────────────────────────────────────────────

  if (notFound || !stored) {
    return (
      <div className="px-4 py-12 flex flex-col items-center gap-6 text-center">
        <p className="text-base font-semibold text-foreground">
          {t("field.renderer.notFound")}
        </p>
        <p className="text-sm text-muted-foreground">
          {t("field.renderer.notFoundHelp")}
        </p>
        <button
          type="button"
          onClick={() => navigate("/field")}
          className="min-h-[64px] w-full max-w-sm rounded-2xl border border-border bg-background text-base font-medium text-foreground"
        >
          {t("field.renderer.backToList")}
        </button>
      </div>
    );
  }

  // ── Success screen ───────────────────────────────────────────────────────

  if (submitState === "success") {
    return (
      <div className="px-4 py-12 flex flex-col items-center gap-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-10 w-10 text-green-600 dark:text-green-400"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <p className="text-xl font-semibold text-foreground">
          {t("field.renderer.successTitle")}
        </p>
        <p className="text-sm text-muted-foreground">
          {t("field.renderer.successBody")}
        </p>
        <button
          type="button"
          onClick={() => navigate("/field")}
          className="min-h-[64px] w-full max-w-sm rounded-2xl bg-primary text-base font-semibold text-primary-foreground active:scale-95 transition-transform"
        >
          {t("field.renderer.backToList")}
        </button>
      </div>
    );
  }

  // ── Form ─────────────────────────────────────────────────────────────────

  const schema = stored.schema;
  const visibleFieldCount = schema.fields.filter(
    (f) => f.type !== "divider" && f.type !== "heading"
  ).length;
  const canUseOneQuestion = visibleFieldCount > 0;

  return (
    <div className="flex flex-col min-h-full">
      {/* Sticky sub-header: back + title + mode toggle */}
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background px-4 py-3">
        <button
          type="button"
          onClick={() => navigate("/field")}
          aria-label={t("field.renderer.back")}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-border text-foreground"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        <h1 className="flex-1 truncate text-base font-semibold text-foreground">
          {stored.title}
        </h1>

        {canUseOneQuestion && (
          <button
            type="button"
            onClick={toggleOneQuestion}
            className="shrink-0 min-h-[44px] rounded-xl border border-border bg-background px-3 text-xs font-medium text-foreground"
          >
            {oneQuestionMode
              ? t("field.renderer.allQuestions")
              : t("field.renderer.oneByOne")}
          </button>
        )}
      </div>

      {/* Error banner (persists until next submit attempt) */}
      {submitState === "error" && (
        <div
          role="alert"
          className="mx-4 mt-3 rounded-xl bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive"
        >
          {t("field.renderer.submitError")}
        </div>
      )}

      {/* Form content — .field-mode applies 64px touch targets via global CSS */}
      <div className="flex-1 px-4 py-6 field-mode">
        {oneQuestionMode && canUseOneQuestion ? (
          <OneQuestionMode
            schema={schema}
            disabled={isSubmitting}
            encryptionPublicKeyPem={stored.encryptionPublicKey}
            onSubmit={handleSubmit}
            renderField={makeFieldRenderOverride(isSubmitting)}
          />
        ) : (
          <FormRenderer
            schema={schema}
            disabled={isSubmitting}
            encryptionPublicKeyPem={stored.encryptionPublicKey}
            onSubmit={handleSubmit}
            submitLabel={t("field.renderer.submit")}
            renderField={makeFieldRenderOverride(isSubmitting)}
          />
        )}
      </div>
    </div>
  );
}
