/**
 * OneQuestionMode — renders a single visible field at a time with prev/next navigation.
 *
 * Respects conditional engine: hidden fields are skipped automatically.
 * Passes accumulated values to onSubmit on the last step.
 */

import { useState, useCallback } from "react";
import { getVisibleFields } from "~/features/data_collection/lib/conditional-engine";
import {
  FormRenderer,
  type RenderFieldOverride,
} from "~/features/data_collection/components/renderer/FormRenderer";
import type { DCFormSchema } from "~/features/data_collection/types/data_collection.types";
import { useFieldTranslation } from "../../i18n/useFieldTranslation";

interface OneQuestionModeProps {
  schema: DCFormSchema;
  disabled?: boolean;
  encryptionPublicKeyPem?: string | null;
  onSubmit: (values: Record<string, unknown>) => void | Promise<void>;
  renderField?: RenderFieldOverride;
}

export function OneQuestionMode({
  schema,
  disabled = false,
  encryptionPublicKeyPem,
  onSubmit,
  renderField,
}: OneQuestionModeProps) {
  const { t } = useFieldTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [values, setValues] = useState<Record<string, unknown>>({});

  const visibleFieldIds = getVisibleFields(schema.fields, values);
  const visibleFields = schema.fields.filter((f) => visibleFieldIds.has(f.id));

  const totalVisible = visibleFields.length;
  const safeIndex = Math.min(currentIndex, Math.max(0, totalVisible - 1));
  const currentField = visibleFields[safeIndex];
  const isLast = safeIndex === totalVisible - 1;
  const isFirst = safeIndex === 0;

  const handleChange = useCallback((newValues: Record<string, unknown>) => {
    setValues(newValues);
  }, []);

  function handleNext() {
    if (safeIndex < totalVisible - 1) {
      setCurrentIndex(safeIndex + 1);
    }
  }

  function handlePrev() {
    if (safeIndex > 0) {
      setCurrentIndex(safeIndex - 1);
    }
  }

  if (totalVisible === 0) {
    return (
      <FormRenderer
        schema={schema}
        values={values}
        onChange={handleChange}
        onSubmit={onSubmit}
        disabled={disabled}
        encryptionPublicKeyPem={encryptionPublicKeyPem}
        submitLabel={t("field.renderer.finish")}
        renderField={renderField}
      />
    );
  }

  const singleFieldSchema: DCFormSchema = {
    ...schema,
    fields: currentField ? [currentField] : [],
    pages: [],
  };

  const progressText = t("field.renderer.progress", {
    current: safeIndex + 1,
    total: totalVisible,
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">
            {progressText}
          </span>
          <span className="text-sm text-muted-foreground">
            {Math.round(((safeIndex + 1) / totalVisible) * 100)}%
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${((safeIndex + 1) / totalVisible) * 100}%` }}
          />
        </div>
      </div>

      {/* Single field rendered via FormRenderer with hideSubmit */}
      {isLast ? (
        <FormRenderer
          schema={singleFieldSchema}
          values={values}
          onChange={handleChange}
          onSubmit={onSubmit}
          disabled={disabled}
          encryptionPublicKeyPem={encryptionPublicKeyPem}
          submitLabel={t("field.renderer.finish")}
          renderField={renderField}
        />
      ) : (
        <FormRenderer
          schema={singleFieldSchema}
          values={values}
          onChange={handleChange}
          disabled={disabled}
          hideSubmit
          renderField={renderField}
        />
      )}

      {/* Navigation buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={handlePrev}
          disabled={isFirst || disabled}
          className="min-h-[64px] rounded-2xl border border-border bg-background text-base font-semibold text-foreground disabled:opacity-40 active:scale-95 transition-transform"
        >
          {t("field.renderer.prev")}
        </button>

        {!isLast && (
          <button
            type="button"
            onClick={handleNext}
            disabled={disabled}
            className="min-h-[64px] rounded-2xl bg-primary text-base font-semibold text-primary-foreground disabled:opacity-40 active:scale-95 transition-transform"
          >
            {t("field.renderer.next")}
          </button>
        )}
      </div>
    </div>
  );
}
