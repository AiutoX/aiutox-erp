import { useNavigate } from "react-router-dom";

import type { FieldQueueForm } from "../../hooks/useFormQueue";
import { useFieldTranslation } from "../../i18n/useFieldTranslation";
import { DownloadButton } from "./DownloadButton";

interface FormQueueItemProps {
  form: FieldQueueForm;
  downloadingId: string | null;
  onDownload: (formId: string) => void;
  onRemoveDownload: (formId: string) => void;
}

function formatCloseDate(value: string | null, locale: string) {
  if (!value) return null;

  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

export function FormQueueItem({
  form,
  downloadingId,
  onDownload,
  onRemoveDownload,
}: FormQueueItemProps) {
  const navigate = useNavigate();
  const { t, lang } = useFieldTranslation();
  const isDownloading = downloadingId === form.id;
  const badgeKey =
    form.status === "downloaded"
      ? "field.queue.downloaded"
      : form.status === "updating"
        ? "field.queue.updating"
        : "field.queue.available";

  const closeDate = formatCloseDate(form.closesAt, lang);

  return (
    <article className="rounded-3xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <h3 className="text-base font-semibold text-card-foreground">
            {form.title}
          </h3>
          {form.category ? (
            <p className="text-sm text-muted-foreground">{form.category}</p>
          ) : null}
          {closeDate ? (
            <p className="text-sm text-muted-foreground">
              {t("field.queue.expires", { date: closeDate })}
            </p>
          ) : null}
        </div>
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          {t(badgeKey)}
        </span>
      </div>

      <div className="mt-4 grid gap-3">
        {form.isDownloaded ? (
          <>
            <button
              type="button"
              onClick={() => navigate(`/field/form/${form.id}`)}
              className="min-h-[64px] rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
            >
              {t("field.queue.open")}
            </button>
            <button
              type="button"
              onClick={() => onRemoveDownload(form.id)}
              className="min-h-[64px] rounded-2xl border border-border bg-background px-4 text-sm font-semibold text-foreground"
            >
              {t("field.queue.removeDownload")}
            </button>
          </>
        ) : (
          <DownloadButton
            isDownloading={isDownloading}
            disabled={Boolean(downloadingId) && !isDownloading}
            onClick={() => onDownload(form.id)}
          />
        )}
      </div>
    </article>
  );
}
