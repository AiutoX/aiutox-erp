/**
 * TimeTracker component
 * Timer with start/stop, session history, and estimated vs actual comparison.
 */

import { useState, useEffect, useCallback } from "react";
import { Play, Square, Trash2, Clock, CalendarPlus } from "lucide-react";
import { format } from "date-fns";
import { cn } from "~/lib/utils";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { showToast } from "~/components/common/Toast";
import { useTimeTracking } from "~/features/tasks/hooks/useTimeTracking";

interface TimeTrackerProps {
  taskId: string;
  estimatedHours?: number;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function TimeTracker({ taskId, estimatedHours }: TimeTrackerProps) {
  const { t } = useTranslation();
  const {
    entries,
    activeSession,
    isTracking,
    totalHours,
    startTracking,
    stopTracking,
    deleteEntry,
    addManualEntry,
    isStarting,
    isStopping,
    isAddingManual,
    isLoading,
  } = useTimeTracking(taskId);

  const [elapsed, setElapsed] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualStart, setManualStart] = useState("");
  const [manualEnd, setManualEnd] = useState("");
  const [manualNotes, setManualNotes] = useState("");

  // Live timer
  useEffect(() => {
    if (!activeSession) {
      setElapsed(0);
      return;
    }

    const startTime = new Date(activeSession.start_time).getTime();
    const tick = () => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  const handleStart = useCallback(() => {
    void startTracking();
  }, [startTracking]);

  const handleStop = useCallback(() => {
    if (activeSession) {
      void stopTracking(activeSession.id);
    }
  }, [activeSession, stopTracking]);

  const handleDelete = useCallback(
    (entryId: string) => {
      void deleteEntry(entryId);
    },
    [deleteEntry]
  );

  const resetManualForm = () => {
    setShowManualForm(false);
    setManualStart("");
    setManualEnd("");
    setManualNotes("");
  };

  const handleAddManual = async () => {
    if (!manualStart || !manualEnd) return;
    const start = new Date(manualStart);
    const end = new Date(manualEnd);
    if (end <= start) {
      showToast(t("tasks.timeTracking.manualEndBeforeStart"), "error");
      return;
    }
    try {
      await addManualEntry({
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        notes: manualNotes.trim() || undefined,
      });
      resetManualForm();
    } catch {
      showToast(t("tasks.timeTracking.manualAddError"), "error");
    }
  };

  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground py-2">
        {t("common.loading")}...
      </div>
    );
  }

  const progressPercent =
    estimatedHours && estimatedHours > 0
      ? Math.min(Math.round((totalHours / estimatedHours) * 100), 100)
      : null;

  const isOverEstimate = estimatedHours ? totalHours > estimatedHours : false;

  return (
    <div className="space-y-3">
      {/* Timer controls */}
      <div className="flex items-center gap-3">
        {isTracking ? (
          <Button
            size="sm"
            variant="destructive"
            onClick={handleStop}
            disabled={isStopping}
            className="gap-1.5"
          >
            <Square className="h-3.5 w-3.5" />
            {t("tasks.timeTracking.stop")}
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={handleStart}
            disabled={isStarting}
            className="gap-1.5"
          >
            <Play className="h-3.5 w-3.5" />
            {t("tasks.timeTracking.start")}
          </Button>
        )}

        {/* Live timer display */}
        {isTracking && (
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            <span className="font-mono text-lg font-semibold tabular-nums">
              {formatDuration(elapsed)}
            </span>
          </div>
        )}

        {!isTracking && totalHours > 0 && (
          <span className="text-sm text-muted-foreground">
            {t("tasks.timeTracking.totalTracked")}: {formatHours(totalHours)}
          </span>
        )}

        {!isTracking && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowManualForm((v) => !v)}
            className="gap-1.5 text-muted-foreground"
          >
            <CalendarPlus className="h-3.5 w-3.5" />
            {t("tasks.timeTracking.addManual")}
          </Button>
        )}
      </div>

      {/* Manual entry form */}
      {showManualForm && (
        <div className="space-y-2 rounded-md border p-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="manual-start" className="text-xs">
                {t("tasks.timeTracking.manualStart")}
              </Label>
              <Input
                id="manual-start"
                type="datetime-local"
                value={manualStart}
                onChange={(e) => setManualStart(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="manual-end" className="text-xs">
                {t("tasks.timeTracking.manualEnd")}
              </Label>
              <Input
                id="manual-end"
                type="datetime-local"
                value={manualEnd}
                onChange={(e) => setManualEnd(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </div>
          <Textarea
            value={manualNotes}
            onChange={(e) => setManualNotes(e.target.value)}
            placeholder={t("tasks.timeTracking.manualNotesPlaceholder")}
            rows={2}
            className="text-sm"
          />
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => void handleAddManual()}
              disabled={isAddingManual || !manualStart || !manualEnd}
            >
              {isAddingManual
                ? t("common.saving")
                : t("tasks.timeTracking.manualSave")}
            </Button>
            <Button size="sm" variant="ghost" onClick={resetManualForm}>
              {t("common.cancel")}
            </Button>
          </div>
        </div>
      )}

      {/* Estimated vs Actual comparison */}
      {estimatedHours != null && estimatedHours > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {formatHours(totalHours)} / {formatHours(estimatedHours)}{" "}
              {t("tasks.timeTracking.estimated")}
            </span>
            {progressPercent != null && (
              <span
                className={cn(isOverEstimate && "text-destructive font-medium")}
              >
                {progressPercent}%
              </span>
            )}
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-300",
                isOverEstimate ? "bg-destructive" : "bg-primary"
              )}
              style={{ width: `${Math.min(progressPercent ?? 0, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Session history toggle */}
      {entries.length > 0 && (
        <div>
          <button
            type="button"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setShowHistory(!showHistory)}
          >
            <Clock className="h-3 w-3" />
            {showHistory
              ? t("tasks.timeTracking.hideHistory")
              : t("tasks.timeTracking.showHistory")}{" "}
            ({entries.length})
          </button>

          {showHistory && (
            <div className="mt-2 space-y-1">
              {entries.slice(0, 10).map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between text-xs py-1 px-2 rounded hover:bg-muted/50 group"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">
                      {format(new Date(entry.start_time), "dd/MM HH:mm")}
                    </span>
                    {entry.end_time && (
                      <>
                        <span className="text-muted-foreground">→</span>
                        <span className="text-muted-foreground">
                          {format(new Date(entry.end_time), "HH:mm")}
                        </span>
                      </>
                    )}
                    {!entry.end_time && (
                      <Badge
                        variant="secondary"
                        className="text-[9px] px-1 py-0"
                      >
                        {t("tasks.timeTracking.active")}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {entry.duration_seconds != null && (
                      <span className="font-mono">
                        {formatDuration(entry.duration_seconds)}
                      </span>
                    )}
                    <button
                      type="button"
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                      onClick={() => handleDelete(entry.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
