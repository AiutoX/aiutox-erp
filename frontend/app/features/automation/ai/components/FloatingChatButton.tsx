import { MessageCircle, X } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useTranslation } from "~/lib/i18n/useTranslation";

interface FloatingChatButtonProps {
  onClick: () => void;
  open: boolean;
}

export function FloatingChatButton({ onClick, open }: FloatingChatButtonProps) {
  const { t } = useTranslation();

  return (
    <Button
      onClick={onClick}
      size="icon"
      className="fixed bottom-4 right-4 z-40 h-12 w-12 rounded-full shadow-lg"
      aria-label={open ? t("ai.chat.close") : t("ai.chat.empty_state")}
    >
      {open ? (
        <X className="h-5 w-5" />
      ) : (
        <MessageCircle className="h-5 w-5" />
      )}
    </Button>
  );
}
