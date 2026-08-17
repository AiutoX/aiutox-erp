/**
 * ConfigPageLayout - Layout específico para páginas de configuración
 *
 * Extiende PageLayout con footer sticky específico para configuraciones
 * que incluye botones Reset y Guardar Cambios
 */

import type { ReactNode } from "react";
import {
  PageLayout,
  type PageLayoutProps,
} from "~/components/layout/PageLayout";
import { Button } from "~/components/ui/button";
import { useTranslation } from "~/lib/i18n/useTranslation";

export interface ConfigPageLayoutProps extends Omit<PageLayoutProps, "footer"> {
  /** Si hay cambios sin guardar */
  hasChanges?: boolean;
  /** Si está guardando */
  isSaving?: boolean;
  /** Callback para resetear cambios */
  onReset?: () => void;
  /** Callback para guardar cambios */
  onSave?: () => void;
  /** Texto del botón de guardar (default: "Guardar Cambios") */
  saveButtonText?: string;
  /** Texto del botón de resetear (default: "Reset") */
  resetButtonText?: string;
  /** Si el botón de guardar está deshabilitado */
  saveDisabled?: boolean;
  /** Contenido adicional en el footer */
  footerContent?: ReactNode;
}

/**
 * Layout específico para páginas de configuración
 */
export function ConfigPageLayout({
  hasChanges = false,
  isSaving = false,
  onReset,
  onSave,
  saveButtonText,
  resetButtonText,
  saveDisabled = false,
  footerContent,
  ...pageLayoutProps
}: ConfigPageLayoutProps) {
  const { t } = useTranslation();

  const defaultSaveText = saveButtonText || t("config.common.saveChanges");
  const defaultResetText = resetButtonText || t("config.common.reset");
  const savingText = t("config.common.saving");

  const footer = (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">{footerContent}</div>
      <div className="flex items-center gap-2">
        {onReset && (
          <Button
            variant="outline"
            onClick={onReset}
            disabled={!hasChanges || isSaving}
          >
            {defaultResetText}
          </Button>
        )}
        {onSave && (
          <Button
            onClick={onSave}
            disabled={!hasChanges || isSaving || saveDisabled}
          >
            {isSaving ? savingText : defaultSaveText}
          </Button>
        )}
      </div>
    </div>
  );

  return <PageLayout {...pageLayoutProps} footer={footer} />;
}
