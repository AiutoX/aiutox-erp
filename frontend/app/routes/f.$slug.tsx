/**
 * Public form route — /f/:slug
 *
 * No authentication required. Renders the form via FormRenderer
 * and submits to POST /f/:slug/submit.
 * Rate limited server-side to 5 submissions/hour per IP.
 */

import { useState, lazy, Suspense } from "react";
import { useParams } from "react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { v4 as uuidv4 } from "uuid";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { PublicLayout } from "~/components/public/PublicLayout";
import { FormRenderer } from "~/features/data_collection/components/renderer/FormRenderer";
import { EConsentRenderer } from "~/features/data_collection/components/renderer/EConsentRenderer";

const ConversationalRenderer = lazy(() =>
  import("~/features/data_collection/components/renderer/ConversationalRenderer").then(
    (m) => ({ default: m.ConversationalRenderer })
  )
);
import {
  getPublicForm,
  submitPublicForm,
  getEncryptionPublicKey,
} from "~/features/data_collection/api/data_collection.api";
import { coerceDcSchema } from "~/features/data_collection/lib/schema-validator";

export function meta() {
  return [{ title: "Form - AiutoX" }];
}

type SubmitState = "idle" | "success" | "error";

export default function PublicFormPage() {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["public-form", slug],
    queryFn: () => getPublicForm(slug!),
    enabled: Boolean(slug),
    retry: false,
  });

  const form = data?.data;

  // Fetch RSA public key when form has encryption enabled (needed by FormRenderer)
  const { data: encKeyData } = useQuery({
    queryKey: ["public-form-enc-key", form?.id],
    queryFn: () => getEncryptionPublicKey(form!.id),
    enabled: Boolean(form?.id && form.encryption_enabled),
    retry: false,
    staleTime: 1000 * 60 * 10, // PEM is stable — 10 min
  });
  const encryptionPublicKeyPem = encKeyData?.data?.public_key_pem ?? null;

  const submitMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      submitPublicForm(slug!, {
        local_id: uuidv4(),
        data: values,
        sync_source: "web",
        client_created_at: new Date().toISOString(),
        _hp: "", // honeypot — must stay empty
      }),
    onSuccess: () => setSubmitState("success"),
    onError: (err) => {
      setSubmitState("error");
      setErrorMessage(err instanceof Error ? err.message : "Submission failed");
    },
  });

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <PublicLayout>
        <div className="py-16 text-center text-sm text-muted-foreground">
          Loading…
        </div>
      </PublicLayout>
    );
  }

  // ── Not found / error ────────────────────────────────────────────────────
  if (error || !form) {
    return (
      <PublicLayout title="Form not found">
        <div className="py-8 text-center">
          <p className="text-sm text-muted-foreground">
            {t("data_collection.public.notFound") ??
              "This form is not available or has been closed."}
          </p>
        </div>
      </PublicLayout>
    );
  }

  // ── Success ──────────────────────────────────────────────────────────────
  if (submitState === "success") {
    return (
      <PublicLayout title={form.title}>
        <div className="py-12 text-center space-y-3">
          <div className="text-4xl">✓</div>
          <p className="font-medium text-foreground">
            {t("data_collection.public.thankYou") ?? "Thank you!"}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("data_collection.public.responseRecorded") ??
              "Your response has been recorded."}
          </p>
        </div>
      </PublicLayout>
    );
  }

  // ── Closed / not yet open ─────────────────────────────────────────────────
  const now = new Date();
  const opensAt = form.opensAt ? new Date(form.opensAt) : null;
  const closesAt = form.closesAt ? new Date(form.closesAt) : null;

  if (opensAt && opensAt > now) {
    return (
      <PublicLayout
        title={form.title}
        description={form.description ?? undefined}
      >
        <div className="py-8 text-center text-sm text-muted-foreground">
          {t("data_collection.public.notOpenYet") ??
            "This form is not open yet."}
          <br />
          {t("data_collection.public.opensAt") ?? "Opens at"}:{" "}
          {opensAt.toLocaleString()}
        </div>
      </PublicLayout>
    );
  }

  if (closesAt && closesAt <= now) {
    return (
      <PublicLayout
        title={form.title}
        description={form.description ?? undefined}
      >
        <div className="py-8 text-center text-sm text-muted-foreground">
          {t("data_collection.public.closed") ?? "This form is closed."}
        </div>
      </PublicLayout>
    );
  }

  const schema = coerceDcSchema(form.schema);

  // Compute remaining responses for quota banner
  const remainingResponses =
    form.maxResponses != null
      ? Math.max(0, form.maxResponses - (form.submissions_count ?? 0))
      : undefined;

  const settings = form.settings as Record<string, unknown> | undefined;
  const isEConsent = settings?.econsent === true;

  // Branding — CSS vars injected into the form container
  const branding = settings?.branding as Record<string, string> | undefined;
  const brandingStyle: React.CSSProperties = branding
    ? ({
        "--dc-primary": branding.primary_color ?? "#023E87",
        "--dc-bg": branding.background_color ?? "#ffffff",
      } as React.CSSProperties)
    : {};

  // Pre-fill — extract allowed fields and readonly flag from settings.prefill_config
  const prefillConfig = (form.settings?.prefill_config) as
    | { allowed_fields?: string[]; readonly_when_prefilled?: boolean }
    | undefined;
  const prefillAllowedFields = prefillConfig?.allowed_fields ?? [];
  const readonlyWhenPrefilled = prefillConfig?.readonly_when_prefilled ?? false;

  // Navigation type — from settings or schema
  const navigationMode = (form.settings?.navigation_type as "wizard" | "tabs" | "scroll" | undefined) ?? "wizard";

  const handleSubmit = async (values: Record<string, unknown>) => {
    setSubmitState("idle");
    setErrorMessage(null);
    await submitMutation.mutateAsync(values);
  };

  return (
    <PublicLayout
      title={form.title}
      description={form.description ?? undefined}
    >
      {/* Branding: logo + banner */}
      {branding?.banner_url && (
        <img
          src={branding.banner_url}
          alt=""
          className="w-full max-h-32 object-cover mb-4 rounded-md"
        />
      )}
      {branding?.logo_url && (
        <img
          src={branding.logo_url}
          alt={form.title}
          className="h-12 mb-4 object-contain"
        />
      )}

      {submitState === "error" && errorMessage && (
        <div className="mb-4 rounded-md bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </div>
      )}

      <div style={brandingStyle}>
        {isEConsent ? (
          <EConsentRenderer
            schema={schema}
            onSubmit={handleSubmit}
            disabled={submitMutation.isPending}
            submitLabel={t("data_collection.public.submit") ?? "Submit"}
            encryptionPublicKeyPem={encryptionPublicKeyPem ?? undefined}
          />
        ) : form.rendering_mode === "conversational" ? (
          <Suspense fallback={<div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>}>
            <ConversationalRenderer
              schema={schema}
              onSubmit={handleSubmit}
              disabled={submitMutation.isPending}
              submitLabel={t("data_collection.public.submit") ?? "Submit"}
            />
          </Suspense>
        ) : (
          <FormRenderer
            schema={schema}
            onSubmit={handleSubmit}
            disabled={submitMutation.isPending}
            submitLabel={t("data_collection.public.submit") ?? "Submit"}
            encryptionPublicKeyPem={encryptionPublicKeyPem}
            remainingResponses={remainingResponses}
            prefillFromUrl={prefillAllowedFields.length > 0}
            prefillAllowedFields={prefillAllowedFields}
            readonlyWhenPrefilled={readonlyWhenPrefilled}
            navigationMode={navigationMode}
          />
        )}
      </div>
    </PublicLayout>
  );
}
