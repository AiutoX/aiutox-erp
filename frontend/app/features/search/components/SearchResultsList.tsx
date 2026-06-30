import React, { useEffect, useRef, useCallback, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useDebounce } from "use-debounce";
import { type SearchResultItem } from "../api/search.api";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { Badge } from "~/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { cn } from "~/lib/utils";

type SearchResultsListProps = {
  results: SearchResultItem[];
  isLoading?: boolean;
  isFetchingMore?: boolean;
  onLoadMore?: () => void;
  onSearch?: (query: string) => void;
  hasMore?: boolean;
  className?: string;
  searchQuery?: string;
  debounceDelay?: number;
};

// Map result types to display names and icons
const resultTypeConfig = {
  user: { icon: "👤", label: "user" },
  document: { icon: "📄", label: "document" },
  file: { icon: "📁", label: "file" },
  task: { icon: "✅", label: "task" },
  comment: { icon: "💬", label: "comment" },
  activity: { icon: "🔄", label: "activity" },
  audit: { icon: "📝", label: "audit" },
  settings: { icon: "⚙️", label: "settings" },
  notification: { icon: "🔔", label: "notification" },
  event: { icon: "📅", label: "event" },
  default: { icon: "🔍", label: "result" },
} as const;

export function SearchResultsList({
  results,
  isLoading = false,
  isFetchingMore = false,
  onLoadMore,
  onSearch,
  hasMore = false,
  className,
  searchQuery = "",
  debounceDelay = 300,
}: SearchResultsListProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const [debouncedQuery] = useDebounce(localQuery, debounceDelay);
  const resultRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLButtonElement>(null);

  // Update local query when prop changes
  useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  // Trigger search when debounced query changes
  useEffect(() => {
    if (onSearch && debouncedQuery && debouncedQuery !== searchQuery) {
      onSearch(debouncedQuery);
    }
  }, [debouncedQuery, onSearch, searchQuery]);

  // Reset focused index when results change
  useEffect(() => {
    setFocusedIndex(-1);
    resultRefs.current = resultRefs.current.slice(0, results.length);
  }, [results]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!containerRef.current) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setFocusedIndex((prev) => {
            const nextIndex = Math.min(prev + 1, results.length - 1);
            resultRefs.current[nextIndex]?.focus();
            return nextIndex;
          });
          break;

        case "ArrowUp":
          e.preventDefault();
          setFocusedIndex((prev) => {
            const nextIndex = Math.max(prev - 1, 0);
            resultRefs.current[nextIndex]?.focus();
            return nextIndex;
          });
          break;

        case "Enter":
          if (focusedIndex >= 0 && focusedIndex < results.length) {
            e.preventDefault();
            const result = results[focusedIndex];
            if (result) navigate(result.url);
          } else if (focusedIndex === -1 && results.length > 0) {
            // Focus first result if pressing enter without any focused item
            e.preventDefault();
            setFocusedIndex(0);
            resultRefs.current[0]?.focus();
          }
          break;

        case "Escape":
          setFocusedIndex(-1);
          (document.activeElement as HTMLElement)?.blur();
          break;

        case "End":
          e.preventDefault();
          if (results.length > 0) {
            const lastIndex = results.length - 1;
            setFocusedIndex(lastIndex);
            resultRefs.current[lastIndex]?.focus();
          }
          break;

        case "Home":
          e.preventDefault();
          if (results.length > 0) {
            setFocusedIndex(0);
            resultRefs.current[0]?.focus();
          }
          break;
      }
    },
    [focusedIndex, results, navigate]
  );

  // Add keyboard event listener
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener("keydown", handleKeyDown);
      return () => {
        container.removeEventListener("keydown", handleKeyDown);
      };
    }
    return undefined;
  }, [handleKeyDown]);

  // Handle click outside to remove focus
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setFocusedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Handle infinite scroll
  const handleScroll = useCallback(() => {
    if (!onLoadMore || !hasMore || isFetchingMore) return;

    const container = containerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const scrollThreshold = 100; // pixels from bottom

    if (scrollTop + clientHeight >= scrollHeight - scrollThreshold) {
      onLoadMore();
    }
  }, [onLoadMore, hasMore, isFetchingMore]);

  // Add scroll event listener for infinite loading
  useEffect(() => {
    const container = containerRef.current;
    if (container && onLoadMore) {
      container.addEventListener("scroll", handleScroll);
      return () => {
        container.removeEventListener("scroll", handleScroll);
      };
    }
    return undefined;
  }, [handleScroll, onLoadMore]);

  // Loading skeleton for search results
  const SearchResultSkeleton = () => (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start space-x-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4" data-testid="search-results-loading">
        {[1, 2, 3].map((i) => (
          <SearchResultSkeleton key={i} />
        ))}
      </div>
    );
  }

  // No results state
  if (!isLoading && results.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-12 text-center"
        data-testid="no-results-message"
      >
        <div className="text-muted-foreground mb-4 text-4xl">🔍</div>
        <h3 className="text-lg font-medium">{t("search.noResultsTitle")}</h3>
        <p className="text-muted-foreground mt-2 max-w-md text-center">
          {t("search.noResultsDescription")}
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn("space-y-4", className)}
      role="listbox"
      aria-label={t("search.results")}
      tabIndex={0}
    >
      {results.map((result, index) => (
        <SearchResultItem
          key={`${result.type}-${result.id}`}
          result={result}
          ref={(el) => {
            resultRefs.current[index] = el;
          }}
          isFocused={focusedIndex === index}
          onFocus={() => setFocusedIndex(index)}
        />
      ))}

      {isFetchingMore && (
        <div
          className="flex justify-center py-4"
          data-testid="loading-more-indicator"
        >
          <div className="flex items-center text-sm text-muted-foreground">
            <span className="loading loading-spinner loading-sm mr-2" />
            {t("search.loadingMore")}
          </div>
        </div>
      )}

      {hasMore && !isFetchingMore && onLoadMore && (
        <div className="flex justify-center pt-2">
          <button
            ref={loadMoreRef}
            onClick={(e) => {
              e.preventDefault();
              onLoadMore();
            }}
            className="text-sm font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 px-2 py-1 rounded"
            disabled={isFetchingMore}
            onFocus={() => setFocusedIndex(-1)}
            data-testid="load-more-button"
          >
            {t("common.loadMore")}
          </button>
        </div>
      )}
    </div>
  );
}

// Individual search result item component
const SearchResultItem = React.forwardRef<
  HTMLAnchorElement,
  {
    result: SearchResultItem;
    isFocused?: boolean;
    onFocus?: () => void;
  }
>(({ result, isFocused = false, onFocus }, ref) => {
  const { t } = useTranslation();
  const typeConfig =
    resultTypeConfig[result.type as keyof typeof resultTypeConfig] ||
    resultTypeConfig.default;

  return (
    <Card
      className={cn(
        "overflow-hidden transition-shadow hover:shadow-md",
        isFocused ? "ring-2 ring-primary ring-offset-2" : ""
      )}
    >
      <Link
        to={result.url}
        className={cn(
          "block outline-none",
          isFocused
            ? "ring-0"
            : "focus:ring-2 focus:ring-primary focus:ring-offset-2"
        )}
        ref={ref}
        onFocus={onFocus}
        role="option"
        aria-selected={isFocused}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-medium leading-tight">
              {result.title}
            </CardTitle>
            <Badge variant="outline" className="ml-2">
              {t(`search.types.${typeConfig.label}`) || result.type}
            </Badge>
          </div>

          {result.description && (
            <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
              {result.description}
            </p>
          )}

          <div className="mt-2 flex items-center text-xs text-muted-foreground">
            <span className="mr-4">
              {formatDistanceToNow(new Date(result.updatedAt), {
                addSuffix: true,
              })}
            </span>
            {result.score && (
              <span className="flex items-center">
                <span className="mr-1">•</span>
                {Math.round(result.score * 100)}% {t("search.match")}
              </span>
            )}
          </div>
        </CardHeader>

        {result.metadata && Object.keys(result.metadata).length > 0 && (
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              {Object.entries(result.metadata).map(([key, value]) => (
                <Badge key={key} variant="outline" className="text-xs">
                  {key}: {String(value)}
                </Badge>
              ))}
            </div>
          </CardContent>
        )}
      </Link>
    </Card>
  );
});
SearchResultItem.displayName = "SearchResultItem";
