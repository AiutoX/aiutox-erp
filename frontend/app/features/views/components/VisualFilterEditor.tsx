/**
 * Visual Filter Editor Component
 * Allows users to create filters using a visual form interface.
 */

import { Plus, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "~/components/ui/button";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Label } from "~/components/ui/label";
import type {
  FieldConfig,
  FilterConfig,
  FilterOperator,
} from "../types/savedFilter.types";
import { getUserFieldsByCategory } from "../config/userFields";
import {
  getOperatorsForField,
  validateFilterCondition,
  getOperatorLabel,
} from "../utils/filterUtils";

export interface VisualFilterEditorProps {
  fields: FieldConfig[];
  value: FilterConfig;
  onChange: (config: FilterConfig) => void;
  onValidationChange?: (isValid: boolean, errors: string[]) => void;
}

interface FilterConditionState {
  id: string;
  fieldName: string;
  operator: FilterOperator;
  value: unknown;
  error?: string;
}

/**
 * Visual Filter Editor component
 */
export function VisualFilterEditor({
  fields,
  value,
  onChange,
  onValidationChange,
}: VisualFilterEditorProps) {
  const fieldsByCategory = getUserFieldsByCategory();
  const { t } = useTranslation();

  // Convert FilterConfig to state
  const [conditions, setConditions] = useState<FilterConditionState[]>(() => {
    if (Object.keys(value).length === 0) {
      return [];
    }
    return Object.entries(value).map(([fieldName, condition], index) => ({
      id: `condition-${index}`,
      fieldName,
      operator: condition.operator,
      value: condition.value,
    }));
  });

  // Update parent when conditions change
  const updateFilterConfig = useCallback(
    (newConditions: FilterConditionState[]) => {
      const config: FilterConfig = {};
      const errors: string[] = [];

      newConditions.forEach((condition) => {
        if (condition.fieldName && condition.operator) {
          const field = fields.find((f) => f.name === condition.fieldName);
          if (field) {
            const validation = validateFilterCondition(
              { operator: condition.operator, value: condition.value },
              field
            );

            if (validation.valid) {
              config[condition.fieldName] = {
                operator: condition.operator,
                value: condition.value,
              };
            } else {
              errors.push(validation.error || "Error de validación");
            }
          }
        }
      });

      onChange(config);
      if (onValidationChange) {
        onValidationChange(errors.length === 0, errors);
      }
    },
    [fields, onChange, onValidationChange]
  );

  const addCondition = useCallback(() => {
    const newCondition: FilterConditionState = {
      id: `condition-${Date.now()}`,
      fieldName: "",
      operator: "eq",
      value: "",
    };
    const newConditions = [...conditions, newCondition];
    setConditions(newConditions);
  }, [conditions]);

  const removeCondition = useCallback(
    (id: string) => {
      const newConditions = conditions.filter((c) => c.id !== id);
      setConditions(newConditions);
      updateFilterConfig(newConditions);
    },
    [conditions, updateFilterConfig]
  );

  const updateCondition = useCallback(
    (id: string, updates: Partial<FilterConditionState>) => {
      const newConditions = conditions.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      );
      setConditions(newConditions);

      // Validate and update
      const condition = newConditions.find((c) => c.id === id);
      if (condition && condition.fieldName) {
        const field = fields.find((f) => f.name === condition.fieldName);
        if (field) {
          const validation = validateFilterCondition(
            { operator: condition.operator, value: condition.value },
            field
          );
          if (!validation.valid) {
            newConditions.forEach((c) => {
              if (c.id === id) {
                c.error = validation.error;
              }
            });
          } else {
            newConditions.forEach((c) => {
              if (c.id === id) {
                c.error = undefined;
              }
            });
          }
        }
      }

      updateFilterConfig(newConditions);
    },
    [conditions, fields, updateFilterConfig]
  );

  const renderValueInput = (
    condition: FilterConditionState,
    field: FieldConfig | undefined
  ) => {
    if (!field) return null;

    const { operator, value } = condition;

    // Operators that don't need a value
    if (operator === "is_null" || operator === "is_not_null") {
      return (
        <div className="text-sm text-muted-foreground">
          Este operador no requiere valor
        </div>
      );
    }

    // Boolean field
    if (field.type === "boolean") {
      return (
        <Select
          value={String(value ?? "")}
          onValueChange={(val) =>
            updateCondition(condition.id, { value: val === "true" })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder={t("common.selectValue")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">Verdadero</SelectItem>
            <SelectItem value="false">Falso</SelectItem>
          </SelectContent>
        </Select>
      );
    }

    // Select field
    if (field.type === "select" && field.options) {
      if (operator === "in" || operator === "not_in") {
        // Multi-select for in/not_in (simplified - single select for now)
        return (
          <Select
            value={String(value ?? "")}
            onValueChange={(val) =>
              updateCondition(condition.id, { value: [val] })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder={t("common.selectValue")} />
            </SelectTrigger>
            <SelectContent>
              {field.options.map((opt) => (
                <SelectItem key={String(opt.value)} value={String(opt.value)}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }
      return (
        <Select
          value={String(value ?? "")}
          onValueChange={(val) => updateCondition(condition.id, { value: val })}
        >
          <SelectTrigger>
            <SelectValue placeholder={t("common.selectValue")} />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((opt) => (
              <SelectItem key={String(opt.value)} value={String(opt.value)}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    // Date/datetime field
    if (field.type === "date" || field.type === "datetime") {
      if (operator === "between") {
        const betweenValue =
          value && typeof value === "object" && "min" in value && "max" in value
            ? (value as { min: string; max: string })
            : { min: "", max: "" };
        return (
          <div className="flex gap-2">
            <Input
              type={field.type === "date" ? "date" : "datetime-local"}
              value={betweenValue.min}
              onChange={(e) =>
                updateCondition(condition.id, {
                  value: { ...betweenValue, min: e.target.value },
                })
              }
              placeholder="Desde"
            />
            <Input
              type={field.type === "date" ? "date" : "datetime-local"}
              value={betweenValue.max}
              onChange={(e) =>
                updateCondition(condition.id, {
                  value: { ...betweenValue, max: e.target.value },
                })
              }
              placeholder="Hasta"
            />
          </div>
        );
      }
      return (
        <Input
          type={field.type === "date" ? "date" : "datetime-local"}
          value={String(value ?? "")}
          onChange={(e) =>
            updateCondition(condition.id, { value: e.target.value })
          }
        />
      );
    }

    // Number field
    if (field.type === "number") {
      if (operator === "between") {
        const betweenValue =
          value && typeof value === "object" && "min" in value && "max" in value
            ? (value as { min: number; max: number })
            : { min: 0, max: 0 };
        return (
          <div className="flex gap-2">
            <Input
              type="number"
              value={betweenValue.min}
              onChange={(e) =>
                updateCondition(condition.id, {
                  value: {
                    ...betweenValue,
                    min: parseFloat(e.target.value) || 0,
                  },
                })
              }
              placeholder="Mínimo"
            />
            <Input
              type="number"
              value={betweenValue.max}
              onChange={(e) =>
                updateCondition(condition.id, {
                  value: {
                    ...betweenValue,
                    max: parseFloat(e.target.value) || 0,
                  },
                })
              }
              placeholder="Máximo"
            />
          </div>
        );
      }
      return (
        <Input
          type="number"
          value={String(value ?? "")}
          onChange={(e) =>
            updateCondition(condition.id, {
              value: parseFloat(e.target.value) || 0,
            })
          }
        />
      );
    }

    // String/email field (default)
    return (
      <Input
        type={field.type === "email" ? "email" : "text"}
        value={String(value ?? "")}
        onChange={(e) =>
          updateCondition(condition.id, { value: e.target.value })
        }
        placeholder={
          field.placeholder || `Ingrese ${field.label.toLowerCase()}`
        }
      />
    );
  };

  return (
    <div className="space-y-4">
      {conditions.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            No hay condiciones definidas
          </p>
          <Button variant="outline" onClick={addCondition} className="gap-2">
            <Plus className="h-4 w-4" />
            Agregar Condición
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {conditions.map((condition, _index) => {
            const field = fields.find((f) => f.name === condition.fieldName);
            const allowedOperators = field ? getOperatorsForField(field) : [];

            return (
              <div
                key={condition.id}
                className="rounded-md border p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Field Selector */}
                    <div className="space-y-1">
                      <Label>Campo</Label>
                      <Select
                        value={condition.fieldName}
                        onValueChange={(val) => {
                          const selectedField = fields.find(
                            (f) => f.name === val
                          );
                          updateCondition(condition.id, {
                            fieldName: val,
                            operator: selectedField?.operators[0] || "eq",
                            value: "",
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t("common.selectField")} />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(fieldsByCategory).map(
                            ([category, categoryFields]) => (
                              <div key={category}>
                                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                  {category}
                                </div>
                                {categoryFields.map((f) => (
                                  <SelectItem key={f.name} value={f.name}>
                                    {f.label}
                                  </SelectItem>
                                ))}
                              </div>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Operator Selector */}
                    <div className="space-y-1">
                      <Label>Operador</Label>
                      <Select
                        value={condition.operator}
                        onValueChange={(val) =>
                          updateCondition(condition.id, {
                            operator: val as FilterOperator,
                            value: "",
                          })
                        }
                        disabled={!condition.fieldName}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar operador" />
                        </SelectTrigger>
                        <SelectContent>
                          {allowedOperators.map((op) => (
                            <SelectItem key={op} value={op}>
                              {getOperatorLabel(op)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Value Input */}
                    <div className="space-y-1">
                      <Label>Valor</Label>
                      {renderValueInput(condition, field)}
                    </div>
                  </div>

                  {/* Remove Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCondition(condition.id)}
                    className="mt-6"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Error Message */}
                {condition.error && (
                  <div className="text-sm text-destructive">
                    {condition.error}
                  </div>
                )}
              </div>
            );
          })}

          {/* Add Condition Button */}
          <Button
            variant="outline"
            onClick={addCondition}
            className="w-full gap-2"
          >
            <Plus className="h-4 w-4" />
            Agregar Otra Condición
          </Button>
        </div>
      )}
    </div>
  );
}
