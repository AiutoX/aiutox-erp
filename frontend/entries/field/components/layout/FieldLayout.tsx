/**
 * FieldLayout — minimal full-screen layout for AiutoX Field App.
 * No sidebar. Fixed header (56px). Scrollable content area.
 */

import type { ReactNode } from "react";
import { FieldHeader } from "./FieldHeader";

interface FieldLayoutProps {
  children: ReactNode;
  onSettingsClick?: () => void;
}

export function FieldLayout({ children, onSettingsClick }: FieldLayoutProps) {
  return (
    <div className="flex flex-col h-svh bg-background text-foreground overflow-hidden">
      <FieldHeader onSettingsClick={onSettingsClick} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
