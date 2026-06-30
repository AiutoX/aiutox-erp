/**
 * CommentForm component
 * Form for creating and editing comments
 */

import { useState } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { Card, CardContent } from "~/components/ui/card";

interface CommentFormProps {
  onSubmit: (content: string) => void;
  onCancel?: () => void;
  initialContent?: string;
  placeholder?: string;
  buttonText?: string;
  loading?: boolean;
}

export function CommentForm({
  onSubmit,
  onCancel,
  initialContent = "",
  placeholder = "Escribe un comentario...",
  buttonText = "Comentar",
  loading = false,
}: CommentFormProps) {
  const { t } = useTranslation();
  const [content, setContent] = useState(initialContent);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim()) {
      onSubmit(content.trim());
      setContent("");
    }
  };

  const handleCancel = () => {
    setContent("");
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={placeholder}
            rows={3}
            className="resize-none"
            disabled={loading}
          />

          <div className="flex justify-end space-x-2">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={loading}
              >
                {t("common.cancel")}
              </Button>
            )}
            <Button
              type="submit"
              size="sm"
              disabled={!content.trim() || loading}
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                  <span>{t("common.saving")}</span>
                </div>
              ) : (
                buttonText
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
