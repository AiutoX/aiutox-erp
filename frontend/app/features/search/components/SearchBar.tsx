import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router"; // Fix import
import { Search as SearchIcon, X, Clock, ChevronRight } from "lucide-react";
import { useDebounce } from "use-debounce";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getSearchSuggestions,
  getRecentSearches,
  saveRecentSearch,
  clearSearchHistory,
} from "../api/search.api";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { ScrollArea } from "~/components/ui/scroll-area";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { useToast } from "~/hooks/useToast";

interface SearchBarProps {
  /** Additional CSS classes */
  className?: string;
  /** Called when search is submitted */
  onSearch?: (query: string) => void;
  /** Optional placeholder text */
  placeholder?: string;
  /** Optional size variant */
  size?: "sm" | "md" | "lg";
  /** Show recent searches when input is focused */
  showRecentSearches?: boolean;
  /** Show search suggestions */
  showSuggestions?: boolean;
}

export function SearchBar({
  className,
  onSearch,
  placeholder,
  size = "md",
  showRecentSearches = true,
  showSuggestions = true,
}: SearchBarProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [debouncedQuery] = useDebounce(query, 300);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Size classes mapping
  const sizeClasses = {
    sm: "h-8 text-sm",
    md: "h-10 text-base",
    lg: "h-12 text-lg",
  };

  // Fetch search suggestions
  const { data: suggestions = [], isFetching: isLoadingSuggestions } = useQuery(
    {
      queryKey: ["search", "suggestions", debouncedQuery],
      queryFn: () => getSearchSuggestions(debouncedQuery),
      enabled: showSuggestions && debouncedQuery.length > 1 && isFocused,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Fetch recent searches
  const { data: recentSearches = [] } = useQuery({
    queryKey: ["search", "recent"],
    queryFn: () => getRecentSearches(),
    enabled: showRecentSearches && isFocused && !query,
    staleTime: 0, // Always fetch fresh recent searches
  });

  // Handle search submission
  const handleSearch = useCallback(
    async (searchQuery: string = query) => {
      const trimmedQuery = searchQuery.trim();
      if (!trimmedQuery) return;

      try {
        // Save to recent searches
        await saveRecentSearch(trimmedQuery);

        // Invalidate recent searches to refetch
        await queryClient.invalidateQueries({ queryKey: ["search", "recent"] });

        // Trigger search
        if (onSearch) {
          onSearch(trimmedQuery);
        } else {
          // Default behavior: navigate to search results
          navigate(`/search?q=${encodeURIComponent(trimmedQuery)}`);
        }

        // Reset and close
        setQuery("");
        setShowDropdown(false);
      } catch (error) {
        console.error("Error saving search:", error);
        toast.error(t("search.error.saveFailed"));
      }
    },
    [query, onSearch, navigate, t, queryClient, toast]
  );

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    } else if (e.key === "Escape") {
      setShowDropdown(false);
      inputRef.current?.blur();
    }
  };

  // Handle clicking outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Show dropdown when focused and there are suggestions or recent searches
  useEffect(() => {
    if (
      isFocused &&
      (suggestions.length > 0 || (recentSearches.length > 0 && !query))
    ) {
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
    }
  }, [isFocused, suggestions, recentSearches, query]);

  // Clear search input
  const clearSearch = () => {
    setQuery("");
    inputRef.current?.focus();
  };

  // Handle clicking on a suggestion
  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    handleSearch(suggestion);
  };

  // Handle clearing recent searches
  const handleClearRecentSearches = async () => {
    try {
      // Call API to clear recent searches
      await clearSearchHistory();
      // Invalidate recent searches to refetch
      await queryClient.invalidateQueries({ queryKey: ["search", "recent"] });
    } catch (error) {
      console.error("Error clearing recent searches:", error);
      toast.error(t("search.error.clearFailed"));
    }
  };
  return (
    <div className={cn("relative w-full max-w-2xl", className)} ref={searchRef}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <SearchIcon
            className={cn("h-4 w-4 text-muted-foreground", {
              "h-3.5 w-3.5": size === "sm",
              "h-5 w-5": size === "lg",
            })}
          />
        </div>
        <Input
          ref={inputRef}
          type="search"
          placeholder={placeholder || t("search.placeholder")}
          className={cn(
            "w-full pl-10 pr-10",
            sizeClasses[size],
            "focus-visible:ring-2 focus-visible:ring-primary/50"
          )}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            setIsFocused(true);
            if (showRecentSearches || (showSuggestions && query)) {
              setShowDropdown(true);
            }
          }}
          onBlur={() => {
            // Small delay to allow click events to fire before hiding
            setTimeout(() => setIsFocused(false), 200);
          }}
          aria-expanded={showDropdown}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          autoComplete="off"
          spellCheck="false"
          aria-controls="search-suggestions"
          role="combobox"
        />
        {query && (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "absolute right-1 top-1/2 -translate-y-1/2 rounded-full text-muted-foreground hover:text-foreground",
              {
                "h-6 w-6": size === "sm",
                "h-8 w-8": size === "md",
                "h-10 w-10": size === "lg",
              }
            )}
            onClick={clearSearch}
            aria-label={t("search.clearSearch")}
          >
            <X
              className={cn("h-4 w-4", {
                "h-3.5 w-3.5": size === "sm",
                "h-4 w-4": size === "md",
                "h-5 w-5": size === "lg",
              })}
            />
          </Button>
        )}
      </div>

      {/* Dropdown with suggestions or recent searches */}
      {showDropdown && (
        <div
          id="search-suggestions"
          className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg overflow-hidden"
          role="listbox"
        >
          <ScrollArea className="max-h-80">
            <div className="py-1">
              {query ? (
                // Show search suggestions
                isLoadingSuggestions ? (
                  <div className="px-4 py-2 text-sm text-muted-foreground flex items-center">
                    <span className="loading loading-spinner loading-xs mr-2" />
                    {t("search.loading")}
                  </div>
                ) : suggestions.length > 0 ? (
                  suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      className="flex w-full items-center gap-3 px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground text-left"
                      onClick={() => handleSuggestionClick(suggestion)}
                      role="option"
                      aria-selected="false"
                    >
                      <SearchIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{suggestion}</span>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-2 text-sm text-muted-foreground">
                    {t("search.noResults")}
                  </div>
                )
              ) : recentSearches.length > 0 ? (
                // Show recent searches
                <>
                  <div className="px-4 py-2 text-xs font-medium text-muted-foreground flex justify-between items-center">
                    <span>{t("search.recentSearches")}</span>
                    <button
                      onClick={handleClearRecentSearches}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      {t("search.clearRecent")}
                    </button>
                  </div>
                  {recentSearches.map((recent, index) => (
                    <button
                      key={index}
                      className="flex w-full items-center gap-3 px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground group"
                      onClick={() => handleSuggestionClick(recent)}
                      role="option"
                      aria-selected="false"
                    >
                      <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{recent}</span>
                      <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </>
              ) : null}
            </div>
          </ScrollArea>

          {/* Keyboard shortcuts help */}
          {showDropdown && (
            <div className="border-t px-4 py-2 text-xs text-muted-foreground flex items-center justify-between bg-muted/50">
              <span>
                {t("search.shortcuts.press")}{" "}
                <kbd className="px-1.5 py-0.5 text-xs rounded border bg-background">
                  ↵
                </kbd>{" "}
                {t("search.shortcuts.toSearch")}
              </span>
              <span className="flex items-center gap-2">
                <kbd className="px-1.5 py-0.5 text-xs rounded border bg-background">
                  ↑↓
                </kbd>
                <span>{t("search.shortcuts.navigate")}</span>
                <kbd className="px-1.5 py-0.5 text-xs rounded border bg-background">
                  Esc
                </kbd>
                <span>{t("search.shortcuts.close")}</span>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Export the component with display name for better dev tools
SearchBar.displayName = "SearchBar";

// Export the component with default props
SearchBar.defaultProps = {
  size: "md",
  showRecentSearches: true,
  showSuggestions: true,
};
