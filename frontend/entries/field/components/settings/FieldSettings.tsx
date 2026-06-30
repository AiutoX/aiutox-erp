/**
 * FieldSettings — configuration screen for AiutoX Field App.
 *
 * Toggles:
 *  - One question at a time (persisted in localStorage 'field_one_question')
 *  - High contrast / sunlight mode (adds 'high-contrast' class to <body>)
 *
 * Actions:
 *  - Change PIN → navigates to PINSetup
 *  - Log out → clears PIN + session, redirects to /login
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useFieldTranslation } from "../../i18n/useFieldTranslation";
import { useFieldAuthStore } from "../../stores/field-auth.store";
import { clearPIN } from "../../lib/pin";

// Version sourced from the build meta injected by Vite, fallback to 'dev'
declare const __APP_VERSION__: string | undefined;
const APP_VERSION =
  typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev";

interface ToggleRowProps {
  label: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}

function ToggleRow({ label, checked, onChange }: ToggleRowProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex min-h-[64px] w-full items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-left active:scale-95 transition-transform"
    >
      <span className="text-base font-medium text-card-foreground">
        {label}
      </span>
      <span
        className={[
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
          checked ? "bg-primary" : "bg-muted",
        ].join(" ")}
      >
        <span
          className={[
            "inline-block h-5 w-5 rounded-full bg-background shadow-sm transition-transform",
            checked ? "translate-x-5" : "translate-x-0.5",
          ].join(" ")}
        />
      </span>
    </button>
  );
}

export function FieldSettings() {
  const { t } = useFieldTranslation();
  const navigate = useNavigate();
  const { userId, clearSession } = useFieldAuthStore();

  const [oneQuestion, setOneQuestion] = useState(
    () => localStorage.getItem("field_one_question") === "true"
  );
  const [highContrast, setHighContrast] = useState(() =>
    document.body.classList.contains("high-contrast")
  );

  // Sync high-contrast class on body
  useEffect(() => {
    if (highContrast) {
      document.body.classList.add("high-contrast");
    } else {
      document.body.classList.remove("high-contrast");
    }
    localStorage.setItem("field_high_contrast", String(highContrast));
  }, [highContrast]);

  // Restore high-contrast on mount
  useEffect(() => {
    const stored = localStorage.getItem("field_high_contrast") === "true";
    if (stored) {
      setHighContrast(true);
    }
  }, []);

  function handleOneQuestionChange(val: boolean) {
    setOneQuestion(val);
    localStorage.setItem("field_one_question", String(val));
  }

  function handleLogout() {
    if (userId) clearPIN(userId);
    clearSession();
    window.location.href = "/login?redirect=/field";
  }

  return (
    <div className="px-4 py-6 space-y-6">
      <h1 className="text-xl font-semibold text-foreground">
        {t("field.settings.title")}
      </h1>

      {/* Toggles */}
      <section className="space-y-3">
        <ToggleRow
          label={t("field.settings.oneQuestionMode")}
          checked={oneQuestion}
          onChange={handleOneQuestionChange}
        />
        <ToggleRow
          label={t("field.settings.highContrast")}
          checked={highContrast}
          onChange={setHighContrast}
        />
      </section>

      {/* Actions */}
      <section className="space-y-3">
        <button
          type="button"
          onClick={() => navigate("/field/pin-setup")}
          className="flex min-h-[64px] w-full items-center rounded-2xl border border-border bg-card px-4 text-base font-medium text-card-foreground active:scale-95 transition-transform"
        >
          {t("field.settings.changePIN")}
        </button>

        <button
          type="button"
          onClick={handleLogout}
          className="flex min-h-[64px] w-full items-center justify-center rounded-2xl bg-destructive text-base font-semibold text-destructive-foreground active:scale-95 transition-transform"
        >
          {t("field.settings.logout")}
        </button>
      </section>

      {/* Version footer */}
      <p className="text-center text-xs text-muted-foreground">
        {t("field.settings.version")} {APP_VERSION}
      </p>
    </div>
  );
}
