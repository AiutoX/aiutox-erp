import { useTranslation } from "~/lib/i18n/useTranslation";
import { Button } from "~/components/ui/button";

interface ExampleChipsProps {
  onSelect: (text: string) => void;
}

export function ExampleChips({ onSelect }: ExampleChipsProps) {
  const { t } = useTranslation();

  const examples = [
    t("ai.chat.example_1"),
    t("ai.chat.example_2"),
    t("ai.chat.example_3"),
  ];

  return (
    <div className="flex flex-col items-center gap-3 py-8 px-4">
      <p className="text-sm text-muted-foreground text-center">
        {t("ai.chat.empty_state")}
      </p>
      <div className="flex flex-wrap gap-2 justify-center">
        {examples.map((ex) => (
          <Button
            key={ex}
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => onSelect(ex)}
          >
            {ex}
          </Button>
        ))}
      </div>
    </div>
  );
}
