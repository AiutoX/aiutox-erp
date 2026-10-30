import { useFieldTranslation } from "../../i18n/useFieldTranslation";

interface DownloadButtonProps {
  isDownloading: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export function DownloadButton({
  isDownloading,
  disabled = false,
  onClick,
}: DownloadButtonProps) {
  const { t } = useFieldTranslation();

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="min-h-[64px] rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isDownloading ? t("field.queue.downloading") : t("field.queue.download")}
    </button>
  );
}
