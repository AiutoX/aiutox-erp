/**
 * Templates page
 * Main page for templates management
 */

import { useState } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { PageLayout } from "~/components/layout/PageLayout";
import { Button } from "~/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { TemplateList } from "~/features/templates/components/TemplateList";
import { TemplateForm } from "~/features/templates/components/TemplateForm";
import { TemplatePreview } from "~/features/templates/components/TemplatePreview";
import { TemplateVersionHistory } from "~/features/templates/components/TemplateVersionHistory";
import {
  useTemplates,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  useRenderTemplate,
} from "~/features/templates/hooks/useTemplates";
import type {
  Template,
  TemplateCreate,
  TemplateUpdate,
  TemplateRenderContext,
  RenderFormat,
  TemplateCategory,
  TemplateVersion,
} from "~/features/templates/types/template.types";

export default function TemplatesPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("list");
  const [_showCreateForm, _setShowCreateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);

  // Query hooks
  const {
    data: templatesData,
    isLoading,
    error,
    refetch,
  } = useTemplates({
    skip: 0,
    limit: 20,
  });

  const createTemplateMutation = useCreateTemplate();
  const updateTemplateMutation = useUpdateTemplate();
  const deleteTemplateMutation = useDeleteTemplate();
  const renderMutation = useRenderTemplate();

  const templates =
    (templatesData as { data?: Template[] } | undefined)?.data ?? [];
  const categories: TemplateCategory[] = [];
  const versions: TemplateVersion[] = [];

  const handleCreate = (data: unknown) => {
    createTemplateMutation.mutate(data as TemplateCreate, {
      onSuccess: () => {
        _setShowCreateForm(false);
        void refetch();
      },
    });
  };

  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
  };

  const handleUpdate = (data: unknown) => {
    if (editingTemplate) {
      updateTemplateMutation.mutate(
        { templateId: editingTemplate.id, data: data as TemplateUpdate },
        {
          onSuccess: () => {
            setEditingTemplate(null);
            void refetch();
          },
        }
      );
    }
  };

  const handleDelete = (template: Template) => {
    if (confirm(t("templates.confirmDelete"))) {
      deleteTemplateMutation.mutate(template.id, {
        onSuccess: () => {
          void refetch();
        },
      });
    }
  };

  const handlePreview = (template: Template) => {
    setPreviewTemplate(template);
  };

  const handleRender = (
    request: { templateId: string; data: TemplateRenderContext },
    _format: RenderFormat
  ) => {
    if (previewTemplate) {
      renderMutation.mutate(
        { templateId: previewTemplate.id, request: { context: request.data } },
        {
          onSuccess: (response) => {
            console.warn("Template rendered:", response.rendered_content);
          },
        }
      );
    }
  };

  const handlePreviewRender = (
    context: TemplateRenderContext,
    format: RenderFormat
  ) => {
    if (previewTemplate) {
      handleRender({ templateId: previewTemplate.id, data: context }, format);
    }
  };

  return (
    <PageLayout
      title={t("templates.title")}
      description={t("templates.description")}
      loading={isLoading}
      error={error}
    >
      <div className="space-y-6">
        {/* Header with actions */}
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">{t("templates.title")}</h2>
          <div className="flex space-x-2">
            <Button onClick={() => void refetch()}>
              {t("common.refresh")}
            </Button>
            <Button onClick={() => _setShowCreateForm(true)}>
              {t("templates.create")}
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="list">{t("templates.tabs.list")}</TabsTrigger>
            <TabsTrigger value="form">{t("templates.tabs.form")}</TabsTrigger>
            <TabsTrigger value="preview">
              {t("templates.tabs.preview")}
            </TabsTrigger>
            <TabsTrigger value="versions">
              {t("templates.tabs.versions")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-6">
            <TemplateList
              templates={templates}
              loading={isLoading}
              onRefresh={() => void refetch()}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onPreview={handlePreview}
              onRender={handleRender}
              onCreate={() => _setShowCreateForm(true)}
            />
          </TabsContent>

          <TabsContent value="form" className="mt-6">
            <div className="max-w-2xl mx-auto">
              <TemplateForm
                template={editingTemplate || undefined}
                categories={categories}
                onSubmit={editingTemplate ? handleUpdate : handleCreate}
                onCancel={() => {
                  _setShowCreateForm(false);
                  setEditingTemplate(null);
                }}
                loading={
                  createTemplateMutation.isPending ||
                  updateTemplateMutation.isPending
                }
              />
            </div>
          </TabsContent>

          <TabsContent value="preview" className="mt-6">
            {previewTemplate && (
              <TemplatePreview
                template={previewTemplate}
                onRender={handlePreviewRender}
                loading={renderMutation.isPending}
              />
            )}
          </TabsContent>

          <TabsContent value="versions" className="mt-6">
            <TemplateVersionHistory
              versions={versions}
              loading={isLoading}
              onRestore={(version) => {
                // Handle version restore
                console.warn("Restore version:", version);
              }}
              onCompare={(v1, v2) => {
                // Handle version comparison
                console.warn("Compare versions:", v1, v2);
              }}
            />
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
}
