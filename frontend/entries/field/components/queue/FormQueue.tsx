import { useFormQueue } from "../../hooks/useFormQueue";
import { useFieldTranslation } from "../../i18n/useFieldTranslation";
import { FormQueueItem } from "./FormQueueItem";

export function FormQueue() {
  const { t } = useFieldTranslation();
  const {
    availableForms,
    downloadedForms,
    downloadingId,
    downloadForm,
    removeDownload,
    downloadedCount,
    totalCount,
    isLoading,
    refetch,
  } = useFormQueue();

  if (isLoading) {
    return (
      <div className="space-y-4 px-4 py-6">
        <div className="h-7 w-48 animate-pulse rounded bg-muted" />
        <div className="h-28 animate-pulse rounded-3xl bg-muted" />
        <div className="h-28 animate-pulse rounded-3xl bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 py-6">
      <section className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              {t("field.queue.title")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("field.queue.summary", {
                downloaded: downloadedCount,
                total: totalCount,
              })}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refetch()}
            className="min-h-[48px] rounded-2xl border border-border px-4 text-sm font-medium text-foreground"
          >
            {t("field.queue.refresh")}
          </button>
        </div>
      </section>

      {!availableForms.length && !downloadedForms.length ? (
        <div className="rounded-3xl border border-dashed border-border px-6 py-10 text-center">
          <p className="text-base font-semibold text-foreground">
            {t("field.queue.empty")}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("field.queue.emptyHelp")}
          </p>
        </div>
      ) : null}

      {downloadedForms.length ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            {t("field.queue.downloadedSection")}
          </h2>
          <div className="space-y-3">
            {downloadedForms.map((form) => (
              <FormQueueItem
                key={form.id}
                form={form}
                downloadingId={downloadingId}
                onDownload={(formId) => void downloadForm(formId)}
                onRemoveDownload={(formId) => void removeDownload(formId)}
              />
            ))}
          </div>
        </section>
      ) : null}

      {availableForms.length ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            {t("field.queue.availableSection")}
          </h2>
          <div className="space-y-3">
            {availableForms.map((form) => (
              <FormQueueItem
                key={form.id}
                form={form}
                downloadingId={downloadingId}
                onDownload={(formId) => void downloadForm(formId)}
                onRemoveDownload={(formId) => void removeDownload(formId)}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
