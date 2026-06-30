import { Link } from "react-router";
import { useTranslation } from "~/lib/i18n/useTranslation";
import type { CapabilityResult } from "../types/chat.types";

interface CapabilityResultCardProps {
  result: CapabilityResult;
}

export function CapabilityResultCard({ result }: CapabilityResultCardProps) {
  const { t } = useTranslation();

  if (result.variant === "list") {
    return (
      <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-1 mt-2">
        <p className="font-medium text-foreground">{result.title}</p>
        {result.items && result.items.length > 0 ? (
          <ul className="space-y-1">
            {result.items.map((item, i) => (
              <li key={i} className="flex items-center gap-2">
                {item.href ? (
                  <Link
                    to={item.href}
                    className="text-primary hover:underline truncate"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className="truncate">{item.label}</span>
                )}
                {item.meta && (
                  <span className="text-xs text-muted-foreground ml-auto shrink-0">
                    {item.meta}
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-xs">{t("common.no_items")}</p>
        )}
      </div>
    );
  }

  if (result.variant === "summary") {
    return (
      <div className="rounded-md border bg-muted/30 p-3 text-sm mt-2">
        <p className="font-medium text-foreground mb-2">{result.title}</p>
        {result.metrics && (
          <div className="grid grid-cols-2 gap-2">
            {result.metrics.map((m, i) => (
              <div key={i} className="bg-background rounded p-2">
                <p className="text-xs text-muted-foreground">{m.label}</p>
                <p className="font-semibold text-sm">{m.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // briefing
  return (
    <div className="rounded-md border bg-muted/30 p-3 text-sm mt-2 space-y-3">
      <p className="font-medium text-foreground">{result.title}</p>
      {result.sections?.map((section, i) => (
        <div key={i} className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {section.heading}
          </p>
          <ul className="space-y-1">
            {section.items.slice(0, 3).map((item, j) => (
              <li key={j}>
                {item.href ? (
                  <Link to={item.href} className="text-primary hover:underline text-xs">
                    {item.label}
                  </Link>
                ) : (
                  <span className="text-xs">{item.label}</span>
                )}
              </li>
            ))}
          </ul>
          {section.viewAllHref && (
            <Link
              to={section.viewAllHref}
              className="text-xs text-primary hover:underline"
            >
              {t("ai.chat.result.view_all")}
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}
