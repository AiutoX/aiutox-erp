import { useState, useEffect, useMemo } from "react";
import { useSearchParams, Link, useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  Search as SearchIcon,
  X,
  AlertCircle,
  FileText,
  User,
  Settings,
  Bell,
  Calendar,
  CheckCircle,
  MessageSquare,
  Activity,
  History,
} from "lucide-react";

import {
  search,
  type SearchResultItem,
  type SearchQueryParams,
} from "~/features/search/api/search.api";
// import { SearchResultsList } from "~/features/search/components/SearchResultsList";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Badge } from "~/components/ui/badge";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
// import { cn } from "~/lib/utils";

// Map result types to icons for the tabs
const typeIcons: Record<string, React.ReactNode> = {
  user: <User className="h-4 w-4" />,
  document: <FileText className="h-4 w-4" />,
  file: <FileText className="h-4 w-4" />,
  task: <CheckCircle className="h-4 w-4" />,
  comment: <MessageSquare className="h-4 w-4" />,
  activity: <Activity className="h-4 w-4" />,
  audit: <History className="h-4 w-4" />,
  settings: <Settings className="h-4 w-4" />,
  notification: <Bell className="h-4 w-4" />,
  event: <Calendar className="h-4 w-4" />,
  default: <FileText className="h-4 w-4" />,
};

// Default search parameters
const DEFAULT_SEARCH_PARAMS: SearchQueryParams = {
  query: "",
  limit: 20,
  offset: 0,
  types: [],
};

export default function SearchPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [activeTab, setActiveTab] = useState("all");
  const [searchFilters, setSearchFilters] = useState<
    Omit<SearchQueryParams, "query">
  >({
    limit: DEFAULT_SEARCH_PARAMS.limit,
    offset: DEFAULT_SEARCH_PARAMS.offset,
    types: [],
  });

  // Extract search query from URL and update state
  useEffect(() => {
    const query = searchParams.get("q") || "";
    setSearchQuery(query);

    // Reset pagination when search query changes
    if (query) {
      setSearchFilters((prev) => ({
        ...prev,
        offset: 0,
      }));
    }
  }, [searchParams]);

  // Search query
  const {
    data: searchResults,
    isLoading,
    isError,
    error,
    isFetching,
  } = useQuery({
    queryKey: ["search", searchQuery, searchFilters],
    queryFn: () =>
      search({
        query: searchQuery,
        ...searchFilters,
      }),
    enabled: !!searchQuery,
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: (previousData) => previousData,
  });

  // Handle API errors
  useEffect(() => {
    if (isError && error) {
      console.error("Search error:", error);
    }
  }, [isError, error]);

  // Handle tab change
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearchFilters((prev) => ({
      ...prev,
      types: tab === "all" ? [] : [tab],
      offset: 0, // Reset pagination when changing tabs
    }));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery) {
      setSearchParams({ q: trimmedQuery });
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchParams({});
    setActiveTab("all");
    setSearchFilters({
      limit: DEFAULT_SEARCH_PARAMS.limit,
      offset: 0,
      types: [],
    });
  };

  // Handle pagination
  const handleLoadMore = () => {
    setSearchFilters((prev) => {
      const current = prev || {
        limit: DEFAULT_SEARCH_PARAMS.limit,
        offset: 0,
        types: [],
      };
      return {
        ...current,
        offset:
          (current.offset! ?? 0) +
          (current.limit! ?? DEFAULT_SEARCH_PARAMS.limit),
      };
    });
  };

  // Handle result item click
  const handleResultClick = (e: React.MouseEvent, url: string) => {
    // If cmd/ctrl + click, open in new tab
    if (e.metaKey || e.ctrlKey) {
      window.open(url, "_blank");
      return;
    }
    void navigate(url);
  };

  // Get icon for result type
  const getTypeIcon = (type: string) => {
    return typeIcons[type] || typeIcons.default;
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Group results by type for the tabs
  const { resultTypes, resultsByType } = useMemo(() => {
    const types = new Set<string>();
    const byType: Record<string, SearchResultItem[]> = {};

    searchResults?.data?.forEach((result) => {
      types.add(result.type);
      if (!byType[result.type]) {
        byType[result.type] = [];
      }
      byType[result.type]!.push(result);
    });

    return {
      resultTypes: Array.from(types).sort(),
      resultsByType: byType,
    };
  }, [searchResults?.data]);

  // Get results for the active tab
  const filteredResults = useMemo(() => {
    if (!searchResults?.data) return [];

    if (activeTab === "all") {
      return searchResults.data;
    }

    return resultsByType[activeTab] || [];
  }, [searchResults?.data, activeTab, resultsByType]);

  // Loading state
  if (isLoading && !searchResults) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <SearchHeader
            searchQuery={searchQuery}
            onSearch={handleSearch}
            onClear={clearSearch}
            setSearchQuery={setSearchQuery}
            isLoading={isLoading}
          />
          <div className="mt-8 space-y-4">
            {[...Array(3)].map((_, i) => (
              <div
                className="h-20 w-full bg-gray-200 rounded animate-pulse"
                key={i}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <SearchHeader
            searchQuery={searchQuery}
            onSearch={handleSearch}
            onClear={clearSearch}
            setSearchQuery={setSearchQuery}
            isLoading={isLoading}
          />
          <Card className="mt-8 border-destructive">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-destructive mb-2">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">Error</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Failed to load search results. Please try again.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
              >
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Empty state
  if (!searchQuery) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
            <SearchIcon className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">
            {t("search.empty.title")}
          </h2>
          <p className="text-muted-foreground mt-2 mb-6">
            {t("search.empty.description")}
          </p>
          <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto">
            <SearchIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("search.placeholder")}
              className="w-full pl-10 pr-10 h-12 text-base"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            {searchQuery && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full text-muted-foreground hover:text-foreground"
                onClick={clearSearch}
              >
                <X className="h-5 w-5" />
                <span className="sr-only">{t("search.clearSearch")}</span>
              </Button>
            )}
          </form>

          <div className="mt-8">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              {t("search.popularSearches")}
            </h3>
            <div className="flex flex-wrap justify-center gap-2">
              {["reports", "settings", "users", "documents"].map((term) => (
                <Button
                  key={term}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery(term);
                    setSearchParams({ q: term });
                  }}
                  className="text-sm"
                >
                  {term}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <form onSubmit={handleSearch} className="relative max-w-2xl">
            <SearchIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("search.placeholder")}
              className="w-full pl-10 pr-10 h-12 text-base"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            {searchQuery && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full text-muted-foreground hover:text-foreground"
                onClick={clearSearch}
              >
                <X className="h-5 w-5" />
                <span className="sr-only">{t("search.clearSearch")}</span>
              </Button>
            )}
          </form>
        </div>

        {/* Results summary */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-muted-foreground">
            {searchResults?.meta?.total
              ? t("search.resultsCount")
              : t("search.noResults")}
          </p>

          {/* Add any additional filters or sort options here */}
        </div>

        {/* No results state */}
        {searchResults?.data.length === 0 ? (
          <Card className="py-12">
            <CardContent className="text-center">
              <SearchIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No results found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your search terms or filters
              </p>
              <Button variant="outline" onClick={clearSearch}>
                Clear search
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Type filters */}
            {resultTypes.length > 0 && (
              <div className="mb-6">
                <Tabs
                  value={activeTab}
                  onValueChange={handleTabChange}
                  className="w-full"
                >
                  <div className="overflow-x-auto pb-1">
                    <TabsList className="w-auto">
                      <TabsTrigger
                        value="all"
                        className="flex items-center gap-2"
                      >
                        {t("search.types.all")}
                        <Badge variant="secondary" className="ml-1">
                          {searchResults?.meta?.total || 0}
                        </Badge>
                      </TabsTrigger>

                      {resultTypes.map((type) => (
                        <TabsTrigger
                          key={type}
                          value={type}
                          className="flex items-center gap-2 capitalize"
                        >
                          {getTypeIcon(type)}
                          {t(`search.types.${type}`) || type}
                          <Badge variant="secondary" className="ml-1">
                            {resultsByType[type]?.length || 0}
                          </Badge>
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </div>
                </Tabs>
              </div>
            )}

            {/* Search results */}
            <div className="space-y-3">
              {filteredResults.map((result) => (
                <Card
                  key={`${result.type}-${result.id}`}
                  className="overflow-hidden hover:shadow-md transition-shadow"
                  onClick={(e) => handleResultClick(e, result.url)}
                >
                  <Link to={result.url} className="block">
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg font-medium line-clamp-2">
                          {result.title}
                        </CardTitle>
                        <div className="shrink-0 ml-2">
                          <Badge variant="outline" className="capitalize">
                            {t(`search.types.${result.type}`) || result.type}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      {result.description && (
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {result.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <span>{formatDate(result.updatedAt)}</span>
                          {result.score && (
                            <>
                              <span>•</span>
                              <span>
                                {Math.round(result.score * 100)}%{" "}
                                {t("search.match")}
                              </span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {(result.metadata?.tags as string[] | undefined)?.map(
                            (tag: string) => (
                              <Badge
                                key={tag}
                                variant="outline"
                                className="text-xs"
                              >
                                {tag}
                              </Badge>
                            )
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Link>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {searchResults &&
              searchResults.meta?.total >
                (searchFilters.offset || 0) + filteredResults.length && (
                <div className="mt-6 flex justify-center">
                  <Button
                    variant="outline"
                    onClick={handleLoadMore}
                    disabled={isFetching}
                    className="min-w-[120px]"
                  >
                    {isFetching ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("common.loading")}
                      </>
                    ) : (
                      t("common.loadMore")
                    )}
                  </Button>
                </div>
              )}

            {/* Loading more indicator */}
            {isFetching && searchResults && searchResults.data.length > 0 && (
              <div className="mt-4 flex justify-center">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("search.loadingMore")}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Search header component
function SearchHeader({
  searchQuery,
  onSearch,
  onClear,
  setSearchQuery,
  isLoading,
}: {
  searchQuery: string;
  onSearch: (e: React.FormEvent) => void;
  onClear: () => void;
  setSearchQuery: (query: string) => void;
  isLoading: boolean;
}) {
  const { t } = useTranslation();

  return (
    <div className="mb-8">
      <h1 className="text-3xl font-bold mb-6">
        {searchQuery ? (
          <>
            {t("search.resultsFor")} &quot;{searchQuery}&quot;
          </>
        ) : (
          t("search.title")
        )}
      </h1>

      <form onSubmit={onSearch} className="relative max-w-2xl">
        <SearchIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t("search.placeholder")}
          className="w-full pl-10 pr-10 h-12 text-base"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          autoFocus
        />
        {(searchQuery || isLoading) && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
                onClick={onClear}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">{t("search.clearSearch")}</span>
              </Button>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
