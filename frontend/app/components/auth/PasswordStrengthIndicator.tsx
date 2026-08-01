/**
 * Password Strength Indicator Component
 * Displays visual feedback for password strength using zxcvbn analysis
 */

import { Progress } from "~/components/ui/progress";
import { useTranslation } from "~/lib/i18n/useTranslation";
import type { PasswordStrengthResult } from "~/hooks/usePasswordStrength";

interface PasswordStrengthIndicatorProps {
  strength: PasswordStrengthResult;
  showRequirements?: boolean;
}

export function PasswordStrengthIndicator({
  strength,
  showRequirements = true,
}: PasswordStrengthIndicatorProps) {
  const { t } = useTranslation();

  // Color mapping for strength levels
  const colorMap = {
    "very-weak": "bg-red-500",
    weak: "bg-orange-500",
    fair: "bg-yellow-500",
    good: "bg-blue-500",
    strong: "bg-green-500",
  };

  // Text color mapping
  const textColorMap = {
    "very-weak": "text-red-600",
    weak: "text-orange-600",
    fair: "text-yellow-600",
    good: "text-blue-600",
    strong: "text-green-600",
  };

  // Progress value (0-100)
  const progressValue = (strength.score / 4) * 100;

  return (
    <div className="space-y-2" data-testid="password-strength-indicator">
      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {t("auth.password.strength.label")}
          </span>
          <span className={`font-medium ${textColorMap[strength.strength]}`}>
            {t(`auth.password.strength.${strength.strength}`)}
          </span>
        </div>
        <Progress
          value={progressValue}
          className={`h-2 ${colorMap[strength.strength]}`}
        />
      </div>

      {/* Crack Time Estimate */}
      {strength.crackTime && (
        <p className="text-xs text-muted-foreground">
          {t("auth.password.strength.crackTime")}: {strength.crackTime}
        </p>
      )}

      {/* Warnings */}
      {strength.warnings.length > 0 && (
        <div className="space-y-1">
          {strength.warnings.map((warning, index) => (
            <p key={index} className="text-xs text-orange-600">
              ⚠️ {warning}
            </p>
          ))}
        </div>
      )}

      {/* Suggestions */}
      {strength.suggestions.length > 0 && (
        <div className="space-y-1">
          {strength.suggestions.map((suggestion, index) => (
            <p key={index} className="text-xs text-muted-foreground">
              💡 {suggestion}
            </p>
          ))}
        </div>
      )}

      {/* Password Requirements */}
      {showRequirements && (
        <div
          className="mt-3 space-y-1 rounded-md border border-border bg-muted/50 p-3"
          data-testid="password-requirements"
        >
          <p className="text-xs font-medium text-foreground">
            {t("auth.password.requirements.title")}
          </p>
          <ul className="space-y-0.5 text-xs text-muted-foreground">
            <li className="flex items-center gap-1">
              <RequirementCheck met={strength.score >= 2} />
              {t("auth.password.requirements.minStrength")}
            </li>
            <li className="flex items-center gap-1">
              <RequirementCheck met={true} />
              {t("auth.password.requirements.minLength")}
            </li>
            <li className="flex items-center gap-1">
              <RequirementCheck met={true} />
              {t("auth.password.requirements.mixedCase")}
            </li>
            <li className="flex items-center gap-1">
              <RequirementCheck met={true} />
              {t("auth.password.requirements.numbers")}
            </li>
            <li className="flex items-center gap-1">
              <RequirementCheck met={true} />
              {t("auth.password.requirements.special")}
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

interface RequirementCheckProps {
  met: boolean;
}

function RequirementCheck({ met }: RequirementCheckProps) {
  return met ? (
    <span className="text-green-600">✓</span>
  ) : (
    <span className="text-muted-foreground">○</span>
  );
}
