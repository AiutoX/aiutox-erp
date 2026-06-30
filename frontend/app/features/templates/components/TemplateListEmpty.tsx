"use client";

import { useTranslation } from "~/lib/i18n/useTranslation";
import { Button } from "~/components/ui/button";

interface TemplateListEmptyProps {
  onCreateClick?: () => void;
}

export function TemplateListEmpty({ onCreateClick }: TemplateListEmptyProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <h3 className="text-lg font-semibold text-gray-700">
        {t("templates.empty.title")}
      </h3>
      <p className="mt-2 text-gray-500">{t("templates.empty.description")}</p>
      {onCreateClick && (
        <Button onClick={onCreateClick} className="mt-4">
          {t("templates.actions.create")}
        </Button>
      )}
    </div>
  );
}
