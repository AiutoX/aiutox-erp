import { useState, useRef, useEffect, useCallback } from "react";
import { Check, Pencil, Plus, Search, X } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { useConversations } from "../hooks/useConversations";
import type { Conversation } from "../types/chat.types";

interface ConversationHistoryListProps {
  onSelect: (id: string) => void;
  onNew: () => void;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

export function ConversationHistoryList({
  onSelect,
  onNew,
}: ConversationHistoryListProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { conversations, isLoading, renameConversation } = useConversations(
    debouncedSearch || undefined
  );

  const recent: Conversation[] = conversations.slice(0, 20);

  const startEditing = useCallback((conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditValue(conv.title ?? "");
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingId(null);
    setEditValue("");
  }, []);

  const saveTitle = useCallback(async () => {
    if (!editingId || !editValue.trim()) {
      cancelEditing();
      return;
    }
    await renameConversation({ id: editingId, title: editValue.trim() });
    cancelEditing();
  }, [editingId, editValue, renameConversation, cancelEditing]);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b space-y-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={onNew}
        >
          <Plus className="h-4 w-4 mr-2" />
          {t("ai.chat.new_conversation")}
        </Button>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("ai.chat.search_placeholder")}
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <p className="text-xs font-medium text-muted-foreground px-3 py-2 uppercase tracking-wide">
          {t("ai.chat.history_title")}
        </p>

        {isLoading && (
          <div className="px-3 py-2 text-xs text-muted-foreground">
            {t("common.loading")}
          </div>
        )}

        {!isLoading && recent.length === 0 && (
          <div className="px-3 py-2 text-xs text-muted-foreground">
            {t("ai.chat.no_history")}
          </div>
        )}

        {recent.map((conv) => (
          <div
            key={conv.id}
            className="w-full text-left px-3 py-2 hover:bg-muted/50 flex items-start gap-2 group cursor-pointer"
            onClick={() => editingId !== conv.id && onSelect(conv.id)}
          >
            <div className="flex-1 min-w-0">
              {editingId === conv.id ? (
                <div className="flex items-center gap-1">
                  <Input
                    ref={editInputRef}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void saveTitle();
                      if (e.key === "Escape") cancelEditing();
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="h-6 text-xs px-1.5"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 shrink-0"
                    onClick={(e) => { e.stopPropagation(); void saveTitle(); }}
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 shrink-0"
                    onClick={(e) => { e.stopPropagation(); cancelEditing(); }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <p className="text-sm truncate flex-1">
                    {conv.title ?? t("ai.chat.new_conversation")}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => startEditing(conv, e)}
                    aria-label={t("ai.chat.rename")}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {formatDate(conv.updated_at)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
