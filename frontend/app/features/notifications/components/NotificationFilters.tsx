/**
 * Notification Filters Component
 * Filters for notification queue and stream
 */

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import {
  SearchIcon,
  DownloadIcon,
  UploadIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

export interface NotificationFilters {
  search?: string;
  status?: string;
  channel?: string;
  event_type?: string;
  recipient_id?: string;
  date_from?: string;
  date_to?: string;
}

interface NotificationFiltersProps {
  filters: NotificationFilters;
  onChange: (filters: NotificationFilters) => void;
  onReset: () => void;
}

export function NotificationFilters({
  filters,
  onChange,
  onReset,
}: NotificationFiltersProps) {
  const updateFilter = (
    key: keyof NotificationFilters,
    value: string | boolean | string[] | null | undefined
  ) => {
    onChange({
      ...filters,
      [key]: value,
    });
  };

  const clearFilter = (key: keyof NotificationFilters) => {
    const newFilters = { ...filters };
    delete newFilters[key];
    onChange(newFilters);
  };

  const hasActiveFilters = Object.values(filters).some(
    (value) => value !== undefined && value !== null && value !== ""
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Filters</CardTitle>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Badge variant="outline" className="text-xs">
                {
                  Object.keys(filters).filter(
                    (key) => filters[key as keyof NotificationFilters]
                  ).length
                }{" "}
                active
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={() => void onReset()}>
              <HugeiconsIcon icon={DownloadIcon} size={16} className="mr-2" />
              Reset
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search
          </label>
          <div className="relative">
            <HugeiconsIcon
              icon={SearchIcon}
              size={16}
              className="absolute left-3 top-1/2 text-gray-400"
            />
            <Input
              placeholder="Search notifications..."
              value={filters.search || ""}
              onChange={(e) => updateFilter("search", e.target.value)}
              className="pl-10"
            />
            {filters.search && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void clearFilter("search")}
                className="absolute right-1 top-1/2"
              >
                <HugeiconsIcon
                  icon={DownloadIcon}
                  size={12}
                  className="absolute right-1 top-1/2"
                />
              </Button>
            )}
          </div>
        </div>

        <Separator />

        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <Select
            value={filters.status || ""}
            onValueChange={(value) =>
              void updateFilter("status", value || undefined)
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          {filters.status && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => void clearFilter("status")}
              className="ml-2"
            >
              <HugeiconsIcon icon={DownloadIcon} size={12} />
            </Button>
          )}
        </div>

        {/* Channel Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Channel
          </label>
          <Select
            value={filters.channel || ""}
            onValueChange={(value) =>
              void updateFilter("channel", value || undefined)
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All channels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All channels</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
              <SelectItem value="webhook">Webhook</SelectItem>
            </SelectContent>
          </Select>
          {filters.channel && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => void clearFilter("channel")}
              className="ml-2"
            >
              <HugeiconsIcon icon={DownloadIcon} size={12} />
            </Button>
          )}
        </div>

        {/* Event Type Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Event Type
          </label>
          <Input
            placeholder="Filter by event type..."
            value={filters.event_type || ""}
            onChange={(e) => updateFilter("event_type", e.target.value)}
          />
          {filters.event_type && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => void clearFilter("event_type")}
              className="ml-2"
            >
              <HugeiconsIcon icon={DownloadIcon} size={12} />
            </Button>
          )}
        </div>

        <Separator />

        {/* Recipient Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Recipient
          </label>
          <div className="relative">
            <HugeiconsIcon
              icon={UploadIcon}
              size={16}
              className="absolute left-3 top-1/2 text-gray-400"
            />
            <Input
              placeholder="Filter by recipient..."
              value={filters.recipient_id || ""}
              onChange={(e) => updateFilter("recipient_id", e.target.value)}
              className="pl-10"
            />
            {filters.recipient_id && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void clearFilter("recipient_id")}
                className="absolute right-1 top-1/2"
              >
                <HugeiconsIcon
                  icon={DownloadIcon}
                  size={12}
                  className="absolute right-1 top-1/2"
                />
              </Button>
            )}
          </div>
        </div>

        <Separator />

        {/* Date Range Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date Range
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                From
              </label>
              <div className="relative">
                <HugeiconsIcon
                  icon={DownloadIcon}
                  size={16}
                  className="absolute left-3 top-1/2 text-gray-400"
                />
                <Input
                  type="date"
                  value={filters.date_from || ""}
                  onChange={(e) => updateFilter("date_from", e.target.value)}
                  className="pl-10"
                />
                {filters.date_from && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void clearFilter("date_from")}
                    className="absolute right-1 top-1/2"
                  >
                    <HugeiconsIcon
                      icon={DownloadIcon}
                      size={12}
                      className="absolute right-1 top-1/2"
                    />
                  </Button>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                To
              </label>
              <div className="relative">
                <HugeiconsIcon
                  icon={DownloadIcon}
                  size={16}
                  className="absolute left-3 top-1/2 text-gray-400"
                />
                <Input
                  type="date"
                  value={filters.date_to || ""}
                  onChange={(e) => updateFilter("date_to", e.target.value)}
                  className="pl-10"
                />
                {filters.date_to && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void clearFilter("date_to")}
                    className="absolute right-1 top-1/2"
                  >
                    <HugeiconsIcon
                      icon={DownloadIcon}
                      size={12}
                      className="absolute right-1 top-1/2"
                    />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Active Filters Summary */}
        {hasActiveFilters && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <HugeiconsIcon
                icon={UploadIcon}
                size={16}
                className="text-gray-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Active Filters:
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {filters.search && (
                <Badge variant="outline" className="text-xs">
                  Search: &quot;{filters.search}&quot;
                </Badge>
              )}
              {filters.status && (
                <Badge variant="outline" className="text-xs">
                  Status: {filters.status}
                </Badge>
              )}
              {filters.channel && (
                <Badge variant="outline" className="text-xs">
                  Channel: {filters.channel}
                </Badge>
              )}
              {filters.event_type && (
                <Badge variant="outline" className="text-xs">
                  Event: {filters.event_type}
                </Badge>
              )}
              {filters.recipient_id && (
                <Badge variant="outline" className="text-xs">
                  Recipient: {filters.recipient_id}
                </Badge>
              )}
              {filters.date_from && (
                <Badge variant="outline" className="text-xs">
                  From: {filters.date_from}
                </Badge>
              )}
              {filters.date_to && (
                <Badge variant="outline" className="text-xs">
                  To: {filters.date_to}
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
