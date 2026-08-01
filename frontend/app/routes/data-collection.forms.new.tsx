/**
 * Data Collection — create new form (full-screen builder)
 * RBAC: page requires data_collection.forms.create
 *
 * Flow:
 *   1. User sees a choice screen: "Blank form" or "From template".
 *   2a. Blank → enter title → open builder → save.
 *   2b. Template → TemplateGallery → pick template → createFormFromTemplate → navigate to edit.
 */

import { useState } from "react";
import { useNavigate } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { ProtectedRoute } from "~/components/auth/ProtectedRoute";
import { RequirePermission } from "~/components/auth/RequirePermission";
import { FormBuilder } from "~/features/data_collection/components/builder/FormBuilder";
import {
  createForm,
  createFormFromTemplate,
} from "~/features/data_collection/api/data_collection.api";
import { makeDefaultSchema } from "~/features/data_collection/lib/schema-validator";
import { TemplateGallery } from "~/features/data_collection/components/templates/TemplateGallery";
import type { DCForm, DCFormSchema } from "~/features/data_collection/types/data_collection.types";

type Step = "choose" | "blank-builder" | "template-gallery";

export function meta() {
  return [{ title: "New Form - Data Collection" }];
}

export default function NewFormPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("choose");
  const [title, setTitle] = useState("");
  const [schema, setSchema] = useState<DCFormSchema>(makeDefaultSchema);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Blank form create
  const createMutation = useMutation({
    mutationFn: () =>
      createForm({
        title: title.trim() || "Untitled Form",
        schema: schema as unknown as Record<string, unknown>,
      }),
    onSuccess: (result) => {
      navigate(`/data-collection/forms/${result.data.id}/edit`);
    },
    onError: (err) =>
      setSaveError(err instanceof Error ? err.message : "Failed to save"),
  });

  // From-template create
  const fromTemplateMutation = useMutation({
    mutationFn: (template: DCForm) =>
      createFormFromTemplate(
        template.id,
        title.trim() || template.title
      ),
    onSuccess: (result) => {
      navigate(`/data-collection/forms/${result.data.id}/edit`);
    },
    onError: (err) =>
      setSaveError(err instanceof Error ? err.message : "Failed to create from template"),
  });

  // ── Step: choose ──────────────────────────────────────────────────────────
  if (step === "choose") {
    return (
      <ProtectedRoute>
        <RequirePermission permission="data_collection.forms.create">
          <div className="flex flex-col h-screen">
            <header className="flex items-center gap-3 px-4 py-2 border-b border-border bg-card shrink-0">
              <button
                type="button"
                onClick={() => navigate("/data-collection")}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                ← {t("data_collection.title") ?? "Data Collection"}
              </button>
              <span className="text-muted-foreground">/</span>
              <span className="text-sm font-medium text-foreground">
                {t("data_collection.forms.new") ?? "New Form"}
              </span>
            </header>

            <div className="flex-1 flex items-center justify-center p-8">
              <div className="max-w-lg w-full space-y-6">
                <h2 className="text-xl font-semibold text-center text-foreground">
                  {t("data_collection.forms.createNew") ?? "Create a new form"}
                </h2>

                {/* Title input shared between both paths */}
                <div>
                  <label className="text-sm text-muted-foreground block mb-1">
                    {t("data_collection.builder.formTitlePlaceholder") ?? "Form title"}
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Untitled Form"
                    className="w-full text-sm border border-border rounded-md px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setStep("blank-builder")}
                    className="flex flex-col items-center gap-3 rounded-xl border-2 border-border hover:border-primary p-6 transition-colors text-center"
                  >
                    <span className="text-3xl">📄</span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {t("data_collection.forms.blankForm") ?? "Blank form"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t("data_collection.forms.blankFormDesc") ?? "Start from scratch"}
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStep("template-gallery")}
                    className="flex flex-col items-center gap-3 rounded-xl border-2 border-border hover:border-primary p-6 transition-colors text-center"
                  >
                    <span className="text-3xl">🗂️</span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {t("data_collection.forms.fromTemplate") ?? "From template"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t("data_collection.forms.fromTemplateDesc") ?? "Browse pre-built templates"}
                      </p>
                    </div>
                  </button>
                </div>

                {saveError && (
                  <p className="text-xs text-destructive text-center">{saveError}</p>
                )}
              </div>
            </div>
          </div>
        </RequirePermission>
      </ProtectedRoute>
    );
  }

  // ── Step: template gallery ─────────────────────────────────────────────────
  if (step === "template-gallery") {
    return (
      <ProtectedRoute>
        <RequirePermission permission="data_collection.forms.create">
          <div className="flex flex-col h-screen">
            <header className="flex items-center gap-3 px-4 py-2 border-b border-border bg-card shrink-0">
              <button
                type="button"
                onClick={() => setStep("choose")}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                ←{" "}
                {t("data_collection.forms.new") ?? "New Form"}
              </button>
              <span className="text-muted-foreground">/</span>
              <span className="text-sm font-medium text-foreground">
                {t("data_collection.forms.fromTemplate") ?? "From template"}
              </span>
              {fromTemplateMutation.isPending && (
                <span className="ml-auto text-xs text-muted-foreground">
                  {t("data_collection.builder.saving") ?? "Creating…"}
                </span>
              )}
              {saveError && (
                <p className="ml-auto text-xs text-destructive">{saveError}</p>
              )}
            </header>

            <div className="flex-1 overflow-y-auto p-6">
              <TemplateGallery
                onSelectTemplate={(template) =>
                  fromTemplateMutation.mutate(template)
                }
              />
            </div>
          </div>
        </RequirePermission>
      </ProtectedRoute>
    );
  }

  // ── Step: blank builder ────────────────────────────────────────────────────
  return (
    <ProtectedRoute>
      <RequirePermission permission="data_collection.forms.create">
        <div className="flex flex-col h-screen">
          {/* Top bar */}
          <header className="flex items-center gap-3 px-4 py-2 border-b border-border bg-card shrink-0">
            <button
              type="button"
              onClick={() => setStep("choose")}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ←{" "}
              {t("data_collection.forms.new") ?? "New Form"}
            </button>
            <span className="text-muted-foreground">/</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                t("data_collection.builder.formTitlePlaceholder") ??
                "Untitled Form"
              }
              className="flex-1 text-sm font-medium bg-transparent border-none focus:outline-none text-foreground"
            />
            <div className="flex items-center gap-2 ml-auto">
              {saveError && (
                <p className="text-xs text-destructive">{saveError}</p>
              )}
              <button
                type="button"
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
                className="px-4 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {createMutation.isPending
                  ? (t("data_collection.builder.saving") ?? "Saving…")
                  : (t("data_collection.builder.save") ?? "Save")}
              </button>
            </div>
          </header>

          {/* Builder */}
          <div className="flex-1 min-h-0">
            <FormBuilder schema={schema} onChange={setSchema} />
          </div>
        </div>
      </RequirePermission>
    </ProtectedRoute>
  );
}
