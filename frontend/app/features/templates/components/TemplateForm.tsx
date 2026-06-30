/**
 * TemplateForm component
 * Form for creating and editing templates
 */

import { useState } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import type {
  Template,
  TemplateCreate,
  TemplateType,
  TemplateCategory,
  TemplateVariable,
} from "~/features/templates/types/template.types";

interface TemplateFormProps {
  template?: Template;
  categories: TemplateCategory[];
  onSubmit: (data: TemplateCreate) => void;
  onCancel?: () => void;
  loading?: boolean;
}

export function TemplateForm({
  template,
  categories,
  onSubmit,
  onCancel,
  loading = false,
}: TemplateFormProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<TemplateCreate>({
    name: template?.name || "",
    category_id: template?.category_id || "",
    type: template?.type || "document",
    subject: template?.subject || "",
    content: template?.content || "",
    variables: template?.variables || [],
    is_active: template?.is_active ?? true,
  });

  const [newVariable, setNewVariable] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleFieldChange = (
    field: keyof TemplateCreate,
    value: string | boolean | string[]
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const addVariable = () => {
    if (
      newVariable.trim() &&
      !formData.variables?.includes(newVariable.trim())
    ) {
      setFormData((prev) => ({
        ...prev,
        variables: [...(prev.variables || []), newVariable.trim()],
      }));
      setNewVariable("");
    }
  };

  const removeVariable = (variable: TemplateVariable) => {
    setFormData((prev) => ({
      ...prev,
      variables: (prev.variables || []).filter(
        (v: TemplateVariable) => v !== variable
      ),
    }));
  };

  const extractVariables = () => {
    // Simple variable extraction from content
    const matches = (formData.content ?? "").match(/\{\{([^}]+)\}\}/g);
    if (matches) {
      const variables = matches.map((match: string) =>
        match.slice(2, -2).trim()
      );
      setFormData((prev) => ({
        ...prev,
        variables: [...new Set([...(prev.variables || []), ...variables])],
      }));
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {template ? t("templates.edit") : t("templates.create")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">{t("templates.name")}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleFieldChange("name", e.target.value)}
                placeholder={t("templates.name.placeholder")}
                required
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">{t("templates.category")}</Label>
              <Select
                value={formData.category_id}
                onValueChange={(value) =>
                  handleFieldChange("category_id", value)
                }
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={t("templates.category.placeholder")}
                  />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label htmlFor="type">{t("templates.type.title")}</Label>
              <Select
                value={formData.type}
                onValueChange={(value: TemplateType) =>
                  handleFieldChange("type", value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("templates.type.placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="document">
                    {t("templates.type.document")}
                  </SelectItem>
                  <SelectItem value="email">
                    {t("templates.type.email")}
                  </SelectItem>
                  <SelectItem value="sms">{t("templates.type.sms")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Subject (for email templates) */}
            {formData.type === "email" && (
              <div className="space-y-2">
                <Label htmlFor="subject">{t("templates.subject")}</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => handleFieldChange("subject", e.target.value)}
                  placeholder={t("templates.subject.placeholder")}
                />
              </div>
            )}

            {/* Content */}
            <div className="space-y-2">
              <Label htmlFor="content">{t("templates.content")}</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => handleFieldChange("content", e.target.value)}
                placeholder={t("templates.content.placeholder")}
                rows={8}
                required
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={extractVariables}
              >
                {t("templates.extractVariables")}
              </Button>
            </div>

            {/* Variables */}
            <div className="space-y-2">
              <Label>{t("templates.variables")}</Label>
              <div className="flex space-x-2">
                <Input
                  value={newVariable}
                  onChange={(e) => setNewVariable(e.target.value)}
                  placeholder={t("templates.variables.placeholder")}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addVariable();
                    }
                  }}
                />
                <Button type="button" onClick={addVariable}>
                  {t("common.add")}
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(formData.variables || []).map((variable) => (
                  <span
                    key={variable}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
                  >
                    {variable}
                    <button
                      type="button"
                      onClick={() => removeVariable(variable)}
                      className="ml-1 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Active */}
            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  handleFieldChange("is_active", checked)
                }
              />
              <Label htmlFor="is_active">{t("templates.active")}</Label>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-2">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  {t("common.cancel")}
                </Button>
              )}
              <Button type="submit" disabled={loading}>
                {loading ? t("common.saving") : t("common.save")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
