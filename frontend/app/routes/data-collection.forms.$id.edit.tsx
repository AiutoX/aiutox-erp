/**
 * Data Collection — edit existing form (full-screen builder)
 * RBAC: page requires data_collection.forms.edit
 */

import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { ProtectedRoute } from "~/components/auth/ProtectedRoute";
import { RequirePermission } from "~/components/auth/RequirePermission";
import { FormBuilder } from "~/features/data_collection/components/builder/FormBuilder";
import type { FormSettings } from "~/features/data_collection/components/builder/FormSettingsPanel";
import {
  getForm,
  updateForm,
  publishForm,
  archiveForm,
  closeForm,
  reopenForm,
  saveFormAsTemplate,
} from "~/features/data_collection/api/data_collection.api";
import QRCodeSVG from "react-qr-code";
import { EncryptionPanel } from "~/features/data_collection/components/encryption/EncryptionPanel";
import { coerceDcSchema } from "~/features/data_collection/lib/schema-validator";
import type { DCFormSchema } from "~/features/data_collection/types/data_collection.types";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "~/components/ui/sheet";

export function meta() {
  return [{ title: "Edit Form - Data Collection" }];
}

export default function EditFormPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: formData, isLoading } = useQuery({
    queryKey: ["data-collection", "forms", id],
    queryFn: () => getForm(id!),
    enabled: Boolean(id),
  });

  const form = formData?.data;

  const [title, setTitle] = useState("");
  const [schema, setSchema] = useState<DCFormSchema | null>(null);
  const [formSettings, setFormSettings] = useState<FormSettings>({
    opens_at: null,
    closes_at: null,
    max_responses: null,
    navigation_type: "wizard",
    prefill_config: { allowed_fields: [], readonly_when_prefilled: false },
    branding: {},
  });
  const [visibility, setVisibility] = useState<"public" | "internal" | "private">("public");
  const [status, setStatus] = useState<"draft" | "published" | "archived" | "closed">("draft");
  const [showQR, setShowQR] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showSaveAsTemplate, setShowSaveAsTemplate] = useState(false);
  const [templateCategory, setTemplateCategory] = useState("");
  const [templateTags, setTemplateTags] = useState("");

  // Populate state once form loads
  useEffect(() => {
    if (form) {
      setTitle(form.title);
      setSchema(coerceDcSchema(form.schema));
      setVisibility((form.visibility) ?? "public");
      setStatus((form.status) ?? "draft");
      const s = form.settings;
      setFormSettings({
        opens_at: form.opensAt ?? null,
        closes_at: form.closesAt ?? null,
        max_responses: form.maxResponses ?? null,
        navigation_type: (form.navigation_type ?? "wizard") as FormSettings["navigation_type"],
        prefill_config: (form.prefill_config as FormSettings["prefill_config"]) ?? {
          allowed_fields: [],
          readonly_when_prefilled: false,
        },
        branding: (s?.branding as FormSettings["branding"]) ?? {},
      });
    }
  }, [form]);

  const sanitizeSchema = (s: DCFormSchema): DCFormSchema => ({
    ...s,
    fields: s.fields.map((f) => {
      if (f.type === "matrix" || f.type === "table_input") {
        const cleaned: typeof f = { ...f };
        if (Array.isArray(f.columns)) {
          const cols = (f.columns).filter((c) => typeof c === "string" && c.trim() !== "");
          cleaned.columns = cols.length > 0 ? cols : ["Column 1"];
        } else {
          cleaned.columns = ["Column 1"];
        }
        if (f.type === "matrix") {
          if (Array.isArray(f.rows)) {
            const rows = (f.rows).filter((r) => typeof r === "string" && r.trim() !== "");
            cleaned.rows = rows.length > 0 ? rows : ["Row 1"];
          } else {
            cleaned.rows = ["Row 1"];
          }
        }
        return cleaned;
      }
      return f;
    }),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      updateForm(id!, {
        title: title.trim() || form?.title,
        visibility,
        schema: (schema ? sanitizeSchema(schema) : schema) as unknown as Record<string, unknown>,
        opens_at: formSettings.opens_at
          ? new Date(formSettings.opens_at).toISOString()
          : undefined,
        closes_at: formSettings.closes_at
          ? new Date(formSettings.closes_at).toISOString()
          : undefined,
        max_responses: formSettings.max_responses ?? undefined,
        navigation_type: formSettings.navigation_type,
        prefill_config: formSettings.prefill_config,
        settings: formSettings.branding && Object.keys(formSettings.branding).length > 0
          ? { branding: formSettings.branding }
          : undefined,
      }),
    onSuccess: async () => {
      setSaveError(null);
      const currentStatus = form?.status as string | undefined;
      if (status !== currentStatus) {
        try {
          if (status === "published" && currentStatus === "draft") {
            await publishForm(id!);
          } else if (status === "closed" && currentStatus === "published") {
            await closeForm(id!);
          } else if (status === "published" && currentStatus === "closed") {
            await reopenForm(id!);
          } else if (status === "archived") {
            await archiveForm(id!);
          } else {
            setStatus((currentStatus as "draft" | "published" | "archived" | "closed") ?? "draft");
            setSaveError(`Cannot transition from '${currentStatus}' to '${status}'`);
          }
        } catch (err) {
          setStatus((currentStatus as "draft" | "published" | "archived" | "closed") ?? "draft");
          setSaveError(err instanceof Error ? err.message : "Status change failed");
        }
      }
      queryClient.invalidateQueries({
        queryKey: ["data-collection", "forms", id],
      });
    },
    onError: (err) =>
      setSaveError(err instanceof Error ? err.message : "Save failed"),
  });

  const saveAsTemplateMutation = useMutation({
    mutationFn: () =>
      saveFormAsTemplate(id!, {
        template_category: templateCategory.trim() || undefined,
        template_tags: templateTags.trim()
          ? templateTags.split(",").map((t) => t.trim()).filter(Boolean)
          : undefined,
      }),
    onSuccess: () => {
      setSaveError(null);
      setShowSaveAsTemplate(false);
      queryClient.invalidateQueries({
        queryKey: ["data-collection", "forms", id],
      });
    },
    onError: (err) =>
      setSaveError(err instanceof Error ? err.message : "Save as template failed"),
  });


  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!form || !schema) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-sm text-destructive">Form not found.</p>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <RequirePermission permission="data_collection.forms.edit">
        <div className="flex flex-col h-screen">
          {/* Top bar */}
          <header className="flex items-center gap-3 px-4 py-2 border-b border-border bg-card shrink-0">
            <button
              type="button"
              onClick={() => navigate("/data-collection")}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← {t("data_collection.title") ?? "Data Collection"}
            </button>
            <span className="text-muted-foreground">/</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="flex-1 text-sm font-medium bg-transparent border-none focus:outline-none text-foreground"
            />
            <div className="flex items-center gap-2 ml-auto">
              {saveError && (
                <p className="text-xs text-destructive">{saveError}</p>
              )}

              {/* Status selector — only valid transitions */}
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as "draft" | "published" | "archived" | "closed")}
                disabled={form.status === "archived"}
                className={`text-xs px-2 py-1.5 rounded-md border focus:outline-none focus:ring-1 focus:ring-ring transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                  status === "published"
                    ? "border-green-500 text-green-600 bg-green-50 dark:bg-green-950"
                    : status === "closed"
                    ? "border-orange-400 text-orange-600 bg-orange-50 dark:bg-orange-950"
                    : status === "archived"
                    ? "border-yellow-500 text-yellow-600 bg-yellow-50 dark:bg-yellow-950"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                {(form.status === "draft" || form.status === "published" || form.status === "closed") && (
                  <option value="draft" disabled={form.status !== "draft"}>
                    {t("data_collection.forms.status.draft") ?? "Draft"}
                  </option>
                )}
                {(form.status === "draft" || form.status === "published" || form.status === "closed") && (
                  <option value="published">{t("data_collection.forms.status.published") ?? "Published"}</option>
                )}
                {(form.status === "published" || form.status === "closed") && (
                  <option value="closed">{t("data_collection.forms.status.closed") ?? "Closed"}</option>
                )}
                {(form.status === "published" || form.status === "closed" || form.status === "archived") && (
                  <option value="archived">{t("data_collection.forms.status.archived") ?? "Archived"}</option>
                )}
              </select>

              {/* Visibility selector */}
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as "public" | "internal" | "private")}
                className="text-xs px-2 py-1.5 rounded-md border border-border bg-card text-muted-foreground hover:text-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
                title={t("data_collection.visibility.label") ?? "Visibility"}
              >
                <option value="public">{t("data_collection.visibility.public") ?? "Public"}</option>
                <option value="internal">{t("data_collection.visibility.internal") ?? "Internal"}</option>
                <option value="private">{t("data_collection.visibility.private") ?? "Private"}</option>
              </select>

              {/* QR Code */}
              {form.status === "published" && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowQR((v) => !v)}
                    className="px-3 py-1.5 text-sm rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    QR
                  </button>
                  {showQR && (
                    <div
                      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
                      onClick={() => setShowQR(false)}
                    >
                      <div
                        className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 shadow-2xl w-80"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-gray-900">
                            {t("data_collection.qr.title") ?? "QR Code"}
                          </h3>
                          <button
                            type="button"
                            onClick={() => setShowQR(false)}
                            className="text-gray-400 hover:text-gray-600 transition-colors rounded-md p-1 hover:bg-gray-100"
                            aria-label="Close"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          </button>
                        </div>
                        {(() => {
                          const publicUrl = `${import.meta.env.VITE_PUBLIC_URL ?? window.location.origin}/f/${form.slug}`;
                          return (
                            <>
                              <div ref={qrRef} className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-center">
                                <QRCodeSVG value={publicUrl} size={192} />
                              </div>
                              <p className="text-xs text-gray-400 text-center truncate" title={publicUrl}>{publicUrl}</p>
                              <div className="flex gap-2 justify-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const svg = qrRef.current?.querySelector("svg");
                                    if (!svg) return;
                                    const blob = new Blob([svg.outerHTML], { type: "image/svg+xml" });
                                    const a = document.createElement("a");
                                    a.href = URL.createObjectURL(blob);
                                    a.download = `${form.slug}-qr.svg`;
                                    a.click();
                                    URL.revokeObjectURL(a.href);
                                  }}
                                  className="px-3 py-1.5 text-xs rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                  {t("data_collection.qr.downloadSvg") ?? "SVG"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const svg = qrRef.current?.querySelector("svg");
                                    if (!svg) return;
                                    const canvas = document.createElement("canvas");
                                    canvas.width = 256; canvas.height = 256;
                                    const ctx = canvas.getContext("2d");
                                    if (!ctx) return;
                                    const img = new Image();
                                    img.onload = () => {
                                      ctx.fillStyle = "white";
                                      ctx.fillRect(0, 0, 256, 256);
                                      ctx.drawImage(img, 0, 0, 256, 256);
                                      const a = document.createElement("a");
                                      a.href = canvas.toDataURL("image/png");
                                      a.download = `${form.slug}-qr.png`;
                                      a.click();
                                    };
                                    img.src = `data:image/svg+xml;base64,${btoa(svg.outerHTML)}`;
                                  }}
                                  className="px-3 py-1.5 text-xs rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                  {t("data_collection.qr.downloadPng") ?? "PNG"}
                                </button>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Security / Encryption settings */}
              <Sheet>
                <SheetTrigger asChild>
                  <button
                    type="button"
                    className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                      form.encryption_enabled
                        ? "border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
                        : "border-border text-muted-foreground hover:text-foreground hover:bg-accent"
                    }`}
                  >
                    {form.encryption_enabled ? "🔒 Encrypted" : "🔓 Security"}
                  </button>
                </SheetTrigger>
                <SheetContent side="right" className="w-96 overflow-y-auto bg-[hsl(var(--modal-bg))] text-[hsl(var(--modal-fg))] border-l border-[hsl(var(--border))]">
                  <SheetHeader className="mb-6">
                    <SheetTitle className="text-[hsl(var(--modal-fg))]">
                      {t("data_collection.encryption.panelTitle") ?? "Seguridad — Cifrado E2E"}
                    </SheetTitle>
                  </SheetHeader>
                  <EncryptionPanel
                    formId={id!}
                    encryptionEnabled={form.encryption_enabled ?? false}
                    onChanged={() =>
                      queryClient.invalidateQueries({
                        queryKey: ["data-collection", "forms", id],
                      })
                    }
                  />
                </SheetContent>
              </Sheet>

              {/* Save as template */}
              <button
                type="button"
                onClick={() => setShowSaveAsTemplate(true)}
                className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                  form.is_template
                    ? "border-primary text-primary hover:bg-primary/10"
                    : "border-border text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
                title={t("data_collection.templates.saveAsTemplate") ?? "Save as template"}
              >
                {form.is_template ? "📋 Template" : "📋"}
              </button>

              {/* Save-as-template modal */}
              {showSaveAsTemplate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                  <div className="rounded-lg border border-[hsl(var(--border))] p-6 space-y-4 shadow-xl w-80 bg-[hsl(var(--modal-bg))] text-[hsl(var(--modal-fg))]">
                    <h3 className="text-sm font-semibold text-[hsl(var(--modal-fg))]">
                      {t("data_collection.templates.saveAsTemplate") ?? "Save as Template"}
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs opacity-70 mb-1 text-[hsl(var(--modal-fg))]">
                          {t("data_collection.templates.category") ?? "Category"}
                        </label>
                        <input
                          type="text"
                          value={templateCategory}
                          onChange={(e) => setTemplateCategory(e.target.value)}
                          placeholder="e.g. HR, Operations, Sales"
                          className="w-full text-sm border border-[hsl(var(--border))] rounded px-2 py-1.5 bg-[hsl(var(--modal-bg))] text-[hsl(var(--modal-fg))] placeholder:opacity-40 focus:outline-none focus:ring-1 focus:ring-[hsl(var(--brand-primary))]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs opacity-70 mb-1 text-[hsl(var(--modal-fg))]">
                          {t("data_collection.templates.tags") ?? "Tags (comma-separated)"}
                        </label>
                        <input
                          type="text"
                          value={templateTags}
                          onChange={(e) => setTemplateTags(e.target.value)}
                          placeholder="e.g. onboarding, survey"
                          className="w-full text-sm border border-[hsl(var(--border))] rounded px-2 py-1.5 bg-[hsl(var(--modal-bg))] text-[hsl(var(--modal-fg))] placeholder:opacity-40 focus:outline-none focus:ring-1 focus:ring-[hsl(var(--brand-primary))]"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setShowSaveAsTemplate(false)}
                        className="px-3 py-1.5 text-xs rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--modal-bg))] text-[hsl(var(--modal-fg))] hover:opacity-80 transition-colors"
                      >
                        {t("common.cancel") ?? "Cancel"}
                      </button>
                      <button
                        type="button"
                        onClick={() => saveAsTemplateMutation.mutate()}
                        disabled={saveAsTemplateMutation.isPending}
                        className="px-3 py-1.5 text-xs rounded-md text-white hover:opacity-90 disabled:opacity-50 transition-colors bg-[hsl(var(--brand-primary))]"
                      >
                        {saveAsTemplateMutation.isPending
                          ? (t("data_collection.builder.saving") ?? "Saving…")
                          : (t("data_collection.templates.saveAsTemplate") ?? "Save as Template")}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => updateMutation.mutate()}
                disabled={updateMutation.isPending}
                className="px-5 py-2 text-sm font-semibold rounded-md text-white hover:opacity-90 disabled:opacity-50 transition-colors shadow-md bg-[hsl(var(--brand-primary))]"
              >
                {updateMutation.isPending
                  ? (t("data_collection.builder.saving") ?? "Saving…")
                  : (t("data_collection.builder.save") ?? "Save")}
              </button>
            </div>
          </header>

          {/* Builder */}
          <div className="flex-1 min-h-0">
            <FormBuilder
              schema={schema}
              onChange={setSchema}
              formSettings={formSettings}
              onSettingsChange={(patch) =>
                setFormSettings((prev) => ({ ...prev, ...patch }))
              }
            />
          </div>
        </div>
      </RequirePermission>
    </ProtectedRoute>
  );
}
