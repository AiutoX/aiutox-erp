/**
 * NodeCatalogPanel
 * Left sidebar for AutomationFlowEditor showing available workflow nodes
 * grouped by category with permission indicators and drag-to-canvas support.
 */

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  Braces,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Clock,
  Lock,
  Play,
  Search,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Input } from "~/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { useTranslation } from "~/lib/i18n/useTranslation";
import {
  getTriggerTypes,
  getActionTypes,
  getDataSources,
} from "../api/automation.api";
import type { NodeCatalogItem } from "../types/automation.types";

// ─── Icon registry ────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, LucideIcon> = {
  Bell,
  Braces,
  CheckSquare,
  Clock,
  Play,
  Zap,
};

function NodeIcon({ name }: { name: string }) {
  const Icon = ICON_MAP[name] ?? Zap;
  return <Icon className="w-4 h-4 shrink-0" />;
}

// ─── Node card ────────────────────────────────────────────────────────────────

interface NodeCardProps {
  item: NodeCatalogItem;
  onAdd: (item: NodeCatalogItem) => void;
}

function NodeCard({ item, onAdd }: NodeCardProps) {
  const { t } = useTranslation();

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      if (!item.available) {
        e.preventDefault();
        return;
      }
      e.dataTransfer.setData("application/nodeType", item.node_type);
      e.dataTransfer.setData(
        "application/nodeConfig",
        JSON.stringify({ label: item.label, node_type: item.node_type })
      );
      e.dataTransfer.effectAllowed = "move";
    },
    [item]
  );

  const handleClick = useCallback(() => {
    if (item.available) onAdd(item);
  }, [item, onAdd]);

  return (
    <div
      draggable={item.available}
      onDragStart={handleDragStart}
      onClick={handleClick}
      className={[
        "group flex items-start gap-2 rounded-md border px-2.5 py-2 text-sm transition-colors select-none",
        item.available
          ? "cursor-grab bg-card hover:bg-accent hover:border-accent-foreground/20 active:cursor-grabbing"
          : "opacity-50 cursor-not-allowed bg-muted/30",
      ].join(" ")}
    >
      <span
        className={
          item.available ? "text-primary mt-0.5" : "text-muted-foreground mt-0.5"
        }
      >
        <NodeIcon name={item.icon} />
      </span>

      <div className="flex-1 min-w-0">
        <p className="font-medium leading-tight truncate">{item.label}</p>
        <p className="text-xs text-muted-foreground leading-snug line-clamp-2 mt-0.5">
          {item.description}
        </p>
      </div>

      {!item.available && item.permission_required && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="mt-0.5 shrink-0">
                <Lock className="w-3 h-3 text-muted-foreground" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="right">
              {t("automation.catalog.lockedTooltip").replace(
                "{{permission}}",
                item.permission_required
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

// ─── Category section ─────────────────────────────────────────────────────────

interface CategorySectionProps {
  title: string;
  items: NodeCatalogItem[];
  onAdd: (item: NodeCatalogItem) => void;
}

function CategorySection({ title, items, onAdd }: CategorySectionProps) {
  const [open, setOpen] = useState(true);

  if (items.length === 0) return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-1.5 px-1 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
      >
        {open ? (
          <ChevronDown className="w-3 h-3" />
        ) : (
          <ChevronRight className="w-3 h-3" />
        )}
        {title}
        <span className="ml-auto font-normal normal-case tracking-normal">
          {items.length}
        </span>
      </button>

      {open && (
        <div className="flex flex-col gap-1 mt-1 mb-3">
          {items.map((item) => (
            <NodeCard key={item.node_type + item.label} item={item} onAdd={onAdd} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export interface NodeCatalogPanelProps {
  onAddNode: (item: NodeCatalogItem) => void;
}

export function NodeCatalogPanel({ onAddNode }: NodeCatalogPanelProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");

  const { data: triggersData } = useQuery({
    queryKey: ["automation", "meta", "triggers"],
    queryFn: getTriggerTypes,
    staleTime: 5 * 60 * 1000,
  });

  const { data: actionsData } = useQuery({
    queryKey: ["automation", "meta", "actions"],
    queryFn: getActionTypes,
    staleTime: 5 * 60 * 1000,
  });

  const { data: dataSourcesData } = useQuery({
    queryKey: ["automation", "meta", "data-sources"],
    queryFn: getDataSources,
    staleTime: 5 * 60 * 1000,
  });

  const triggers: NodeCatalogItem[] = triggersData?.data ?? [];
  const actions: NodeCatalogItem[] = actionsData?.data ?? [];
  const dataSources: NodeCatalogItem[] = dataSourcesData?.data ?? [];

  const filter = (items: NodeCatalogItem[]) =>
    search.trim()
      ? items.filter(
          (i) =>
            i.label.toLowerCase().includes(search.toLowerCase()) ||
            i.description.toLowerCase().includes(search.toLowerCase())
        )
      : items;

  return (
    <div className="h-full flex flex-col border-r bg-card overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2.5 border-b">
        <p className="text-sm font-semibold">{t("automation.catalog.title")}</p>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            className="h-7 pl-7 text-xs"
            placeholder={t("automation.catalog.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Catalog */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        <CategorySection
          title={t("automation.catalog.triggers")}
          items={filter(triggers)}
          onAdd={onAddNode}
        />
        <CategorySection
          title={t("automation.catalog.dataSources")}
          items={filter(dataSources)}
          onAdd={onAddNode}
        />
        <CategorySection
          title={t("automation.catalog.actions")}
          items={filter(actions)}
          onAdd={onAddNode}
        />
      </div>
    </div>
  );
}
