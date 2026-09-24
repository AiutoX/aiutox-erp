import { useTranslation } from "~/lib/i18n/useTranslation";

export function ModuleDetailPage() {
  const { t } = useTranslation();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">{t("marketplace.detail.title")}</h1>
      <p className="mt-2 text-muted-foreground">
        {t("marketplace.detail.description")}
      </p>
    </div>
  );
}
