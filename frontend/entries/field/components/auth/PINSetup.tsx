/**
 * PINSetup — First-time PIN configuration for AiutoX Field App.
 *
 * Shown when the user has a valid ERP JWT but has not yet configured a field PIN.
 * Requires entering the PIN twice to confirm.
 * Stores SHA-256 hash in localStorage via pin.ts.
 */
import { useState, useCallback } from "react";
import { hashPIN, storePIN } from "../../lib/pin";
import { useFieldTranslation } from "../../i18n/useFieldTranslation";

interface PINSetupProps {
  userId: string;
  onDone: () => void;
}

const MIN_PIN = 4;
const MAX_PIN = 6;

export function PINSetup({ userId, onDone }: PINSetupProps) {
  const { t } = useFieldTranslation();
  const [step, setStep] = useState<"enter" | "confirm">("enter");
  const [firstPIN, setFirstPIN] = useState("");
  const [digits, setDigits] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

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

  const handleDigit = useCallback((d: string) => {
    setError(null);
    setDigits((prev) => (prev.length < MAX_PIN ? [...prev, d] : prev));
  }, []);

  const handleBackspace = useCallback(() => {
    setDigits((prev) => prev.slice(0, -1));
    setError(null);
  }, []);

  const handleNext = useCallback(async () => {
    const pin = digits.join("");
    if (pin.length < MIN_PIN) return;

    if (step === "enter") {
      setFirstPIN(pin);
      setDigits([]);
      setStep("confirm");
      return;
    }

    // confirm step
    if (pin !== firstPIN) {
      setError(t("field.auth.pinSetup.mismatch"));
      setDigits([]);
      setStep("enter");
      setFirstPIN("");
      return;
    }

    const hash = await hashPIN(pin);
    storePIN(userId, hash);
    onDone();
  }, [digits, firstPIN, onDone, step, t, userId]);

  const title =
    step === "enter"
      ? t("field.auth.pinSetup.title")
      : t("field.auth.pinSetup.confirm");

  return (
    <div className="flex flex-col items-center justify-center min-h-svh bg-background px-6 py-8">
      <div className="mb-8 text-center">
        <p className="text-xl font-bold text-foreground">{title}</p>
        {step === "enter" && (
          <p className="text-sm text-muted-foreground mt-1">
            {t("field.auth.pinSetup.subtitle")}
          </p>
        )}
      </div>

      {/* PIN dots */}
      <div className="flex gap-4 mb-8">
        {Array.from({ length: MAX_PIN }).map((_, i) => (
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

      {/* Error */}
      <div className="h-6 mb-4 text-center">
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-xs mb-8">
        {keypadButtons.map((btn, idx) => {
          if (btn === "") return <div key={idx} />;
          if (btn === "←") {
            return (
              <button
                key={idx}
                onClick={handleBackspace}
                disabled={digits.length === 0}
                aria-label="Borrar"
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
              className="min-h-[64px] rounded-xl text-2xl font-semibold bg-secondary text-secondary-foreground active:scale-95 transition-transform"
            >
              {btn}
            </button>
          );
        })}
      </div>

      <button
        onClick={handleNext}
        disabled={digits.length < MIN_PIN}
        className="w-full max-w-xs min-h-[56px] rounded-xl text-base font-semibold bg-primary text-primary-foreground disabled:opacity-40 active:scale-95 transition-transform"
      >
        {step === "enter" ? "→" : t("field.auth.pinSetup.save")}
      </button>
    </div>
  );
}
