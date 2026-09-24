/**
 * PINLogin — Full-screen PIN entry UI for AiutoX Field App.
 *
 * Touch-first design:
 *  - 12-button numeric keypad with minimum 64px height per button
 *  - Dot display for PIN digits (1–6)
 *  - Lockout countdown shown inline
 *  - Link to fall back to ERP password login
 */
import { useState, useEffect, useCallback } from "react";
import { getLockout, verifyPIN } from "../../lib/pin";
import { useFieldTranslation } from "../../i18n/useFieldTranslation";

interface PINLoginProps {
  userId: string;
  onSuccess: () => void;
}

const MAX_PIN_LENGTH = 6;

export function PINLogin({ userId, onSuccess }: PINLoginProps) {
  const { t } = useFieldTranslation();
  const [digits, setDigits] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const [attempts, setAttempts] = useState(0);

  // Refresh lockout countdown every second
  useEffect(() => {
    const interval = setInterval(() => {
      const status = getLockout(userId);
      setAttempts(status.attempts);
      if (status.locked) {
        setLockoutSeconds(Math.ceil(status.remainingMs / 1000));
      } else {
        setLockoutSeconds(0);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [userId]);

  const isLocked = lockoutSeconds > 0;

  const handleDigit = useCallback(
    (d: string) => {
      if (isLocked) return;
      setError(null);
      setDigits((prev) => (prev.length < MAX_PIN_LENGTH ? [...prev, d] : prev));
    },
    [isLocked]
  );

  const handleBackspace = useCallback(() => {
    setDigits((prev) => prev.slice(0, -1));
    setError(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (isLocked || digits.length < 4) return;
    const pin = digits.join("");
    const ok = await verifyPIN(userId, pin);
    if (ok) {
      onSuccess();
    } else {
      setDigits([]);
      const status = getLockout(userId);
      setAttempts(status.attempts);
      if (status.locked) {
        setLockoutSeconds(Math.ceil(status.remainingMs / 1000));
        setError(null);
      } else {
        setError(t("field.auth.pinLogin.error"));
      }
    }
  }, [digits, isLocked, onSuccess, t, userId]);

  const keypadButtons = [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "",
    "0",
    "←",
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-svh bg-background px-6 py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <p className="text-xl font-bold text-foreground">
          {t("field.auth.pinLogin.title")}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          {t("field.auth.pinLogin.subtitle")}
        </p>
      </div>

      {/* PIN dots */}
      <div className="flex gap-4 mb-8" aria-label="PIN digits entered">
        {Array.from({ length: MAX_PIN_LENGTH }).map((_, i) => (
          <div
            key={i}
            className={[
              "w-4 h-4 rounded-full border-2 transition-all duration-150",
              i < digits.length
                ? "bg-primary border-primary"
                : "bg-transparent border-muted-foreground/40",
            ].join(" ")}
          />
        ))}
      </div>

      {/* Error / lockout message */}
      <div className="h-6 mb-4 text-center">
        {isLocked && (
          <p className="text-sm text-destructive font-medium">
            {t("field.auth.pinLogin.lockout", { seconds: lockoutSeconds })}
          </p>
        )}
        {!isLocked && error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        {!isLocked && !error && attempts > 0 && attempts < 3 && (
          <p className="text-sm text-muted-foreground">
            {t("field.auth.pinLogin.attemptsRemaining", {
              count: 3 - attempts,
            })}
          </p>
        )}
      </div>

      {/* Numeric keypad */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-xs mb-8">
        {keypadButtons.map((btn, idx) => {
          if (btn === "") {
            return <div key={idx} />;
          }
          if (btn === "←") {
            return (
              <button
                key={idx}
                onClick={handleBackspace}
                disabled={isLocked || digits.length === 0}
                aria-label={t("field.auth.pinLogin.clear")}
                className="min-h-[64px] rounded-xl text-xl font-semibold bg-secondary text-secondary-foreground active:scale-95 transition-transform disabled:opacity-30"
              >
                ←
              </button>
            );
          }
          return (
            <button
              key={idx}
              onClick={() => handleDigit(btn)}
              disabled={isLocked}
              aria-label={btn}
              className="min-h-[64px] rounded-xl text-2xl font-semibold bg-secondary text-secondary-foreground active:scale-95 transition-transform disabled:opacity-30"
            >
              {btn}
            </button>
          );
        })}
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={isLocked || digits.length < 4}
        className="w-full max-w-xs min-h-[56px] rounded-xl text-base font-semibold bg-primary text-primary-foreground disabled:opacity-40 active:scale-95 transition-transform mb-4"
      >
        {t("field.auth.pinLogin.enter")}
      </button>

      {/* ERP fallback */}
      <a
        href={`/login?redirect=/field`}
        className="text-sm text-muted-foreground underline-offset-2 hover:underline"
      >
        {t("field.auth.pinLogin.usePassword")}
      </a>
    </div>
  );
}
