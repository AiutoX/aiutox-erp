import { Search as SearchIcon, X } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { useTranslation } from "~/lib/i18n/useTranslation";

interface SearchHeaderProps {
  searchQuery: string;
  onSearch: (e: React.FormEvent) => void;
  onClear: () => void;
  resultCount?: number;
  className?: string;
}

export function SearchHeader({
  searchQuery,
  onSearch,
  onClear,
  resultCount,
  className,
}: SearchHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className={className}>
      <form onSubmit={onSearch} className="relative max-w-2xl">
        <SearchIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t("search.placeholder")}
          className="w-full pl-10 pr-10 h-12 text-base"
          value={searchQuery}
          onChange={(_e) => {
            // Update local state if needed
            // const target = e.target as HTMLInputElement; // Unused for now
            // This assumes the parent component handles the actual state
            // and updates the searchQuery prop accordingly
          }}
          autoFocus
        />
        {searchQuery && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full text-muted-foreground hover:text-foreground"
            onClick={onClear}
          >
            <X className="h-5 w-5" />
            <span className="sr-only">{t("search.clearSearch")}</span>
          </Button>
        )}
      </form>

      {resultCount !== undefined && (
        <div className="mt-4">
          <p className="text-sm text-muted-foreground">
            {resultCount > 0
              ? t("search.resultsCount").replace(
                  "{count}",
                  resultCount.toString()
                )
              : searchQuery
                ? t("search.noResultsFor")
                : t("search.noResults")}
          </p>
        </div>
      )}
    </div>
  );
}
