/**
 * TemplatePreview component
 * Displays a preview of the rendered template
 */

import { useState } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Textarea } from "~/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Label } from "~/components/ui/label";
import type {
  Template,
  TemplateRenderContext,
  RenderFormat,
} from "~/features/templates/types/template.types";

interface TemplatePreviewProps {
  template: Template;
  onRender?: (context: TemplateRenderContext, format: RenderFormat) => void;
  loading?: boolean;
}

export function TemplatePreview({
  template,
  onRender,
  loading = false,
}: TemplatePreviewProps) {
  const { t } = useTranslation();
  const [context, setContext] = useState<TemplateRenderContext>({
    company_name: "AiutoX ERP",
    user_name: "John Doe",
    date: new Date().toLocaleDateString(),
    amount: "1000.00",
    order_number: "12345",
  });

  const [format, setFormat] = useState<RenderFormat>("html");

  const handleContextChange = (key: string, value: string) => {
    setContext((prev: TemplateRenderContext) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleRender = () => {
    if (onRender) {
      onRender(context, format);
    }
  };

  const simpleRender = (
    content: string,
    ctx: TemplateRenderContext
  ): string => {
    return content.replace(
      /\{\{([^}]+)\}\}/g,
      (match: string, key: string): string => {
        const value = ctx[key.trim()];
        return value !== undefined ? String(value) : match;
      }
    );
  };

  const renderedContent = simpleRender(
    template.content ?? template.body,
    context
  );

  return (
    <div className="space-y-6">
      {/* Preview Controls */}
      <Card>
        <CardHeader>
          <CardTitle>{t("templates.preview.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Format Selection */}
          <div className="space-y-2">
            <Label>{t("templates.preview.format")}</Label>
            <Select
              value={format}
              onValueChange={(value: RenderFormat) => setFormat(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="html">HTML</SelectItem>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Context Variables */}
          <div className="space-y-2">
            <Label>{t("templates.preview.context")}</Label>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(context).map(([key, value]) => (
                <div key={key} className="space-y-1">
                  <Label htmlFor={key} className="text-sm">
                    {key}
                  </Label>
                  <Textarea
                    id={key}
                    value={value as string}
                    onChange={(e) => handleContextChange(key, e.target.value)}
                    rows={1}
                    className="resize-none"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Render Button */}
          <Button onClick={handleRender} disabled={loading}>
            {loading ? t("common.loading") : t("templates.preview.render")}
          </Button>
        </CardContent>
      </Card>

      {/* Preview Content */}
      <Card>
        <CardHeader>
          <CardTitle>{t("templates.preview.output")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md p-4 bg-muted/50">
            {format === "html" ? (
              <div dangerouslySetInnerHTML={{ __html: renderedContent }} />
            ) : (
              <pre className="whitespace-pre-wrap text-sm">
                {renderedContent}
              </pre>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
