/**
 * JSON Filter Editor Component
 * Advanced mode for editing filters as raw JSON.
 */

import { AlertCircle, CheckCircle2, Code2 } from "lucide-react";
import { useState } from "react";
import AceEditor from "react-ace";
import "ace-builds/src-noconflict/mode-json";
import "ace-builds/src-noconflict/theme-github";
import "ace-builds/src-noconflict/ext-language_tools";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import type { FilterConfig } from "../types/savedFilter.types";
import { formatFilterJSON, parseFilterJSON } from "../utils/filterUtils";

export interface JSONFilterEditorProps {
  value: FilterConfig;
  onChange: (config: FilterConfig) => void;
  onValidationChange?: (isValid: boolean, error?: string) => void;
}

/**
 * JSON Filter Editor component
 */
export function JSONFilterEditor({
  value,
  onChange,
  onValidationChange,
}: JSONFilterEditorProps) {
  const [jsonString, setJsonString] = useState(() => formatFilterJSON(value));
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(true);

  const handleJsonChange = (newValue: string) => {
    setJsonString(newValue);
    setValidationError(null);
    setIsValid(false);

    // Try to parse and validate
    const result = parseFilterJSON(newValue);
    if (result.success && result.data) {
      setIsValid(true);
      onChange(result.data);
      if (onValidationChange) {
        onValidationChange(true);
      }
    } else {
      setIsValid(false);
      setValidationError(result.error || "Error al parsear JSON");
      if (onValidationChange) {
        onValidationChange(false, result.error);
      }
    }
  };

  const handleValidate = () => {
    const result = parseFilterJSON(jsonString);
    if (result.success && result.data) {
      setIsValid(true);
      setValidationError(null);
      onChange(result.data);
      if (onValidationChange) {
        onValidationChange(true);
      }
    } else {
      setIsValid(false);
      setValidationError(result.error || "JSON inválido");
      if (onValidationChange) {
        onValidationChange(false, result.error);
      }
    }
  };

  const handleFormat = () => {
    const result = parseFilterJSON(jsonString);
    if (result.success && result.data) {
      const formatted = formatFilterJSON(result.data);
      setJsonString(formatted);
      setIsValid(true);
      setValidationError(null);
      onChange(result.data);
      if (onValidationChange) {
        onValidationChange(true);
      }
    } else {
      setValidationError(result.error || "No se puede formatear JSON inválido");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <Code2 className="h-4 w-4" />
          Editor JSON (Modo Avanzado)
        </Label>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleFormat}>
            Formatear
          </Button>
          <Button variant="outline" size="sm" onClick={handleValidate}>
            Validar
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <AceEditor
          mode="json"
          theme="github"
          value={jsonString}
          onChange={handleJsonChange}
          width="100%"
          height="400px"
          fontSize={14}
          showPrintMargin={true}
          showGutter={true}
          highlightActiveLine={true}
          setOptions={{
            enableBasicAutocompletion: true,
            enableLiveAutocompletion: true,
            enableSnippets: true,
            showLineNumbers: true,
            tabSize: 2,
          }}
        />
      </div>

      {/* Validation Status */}
      {validationError ? (
        <div className="flex items-center gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>{validationError}</span>
        </div>
      ) : isValid && jsonString.trim() !== "" ? (
        <div className="flex items-center gap-2 rounded-md border border-green-500 bg-green-50 p-3 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-200">
          <CheckCircle2 className="h-4 w-4" />
          <span>JSON válido</span>
        </div>
      ) : null}

      <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
        <p className="font-semibold">⚠️ Advertencia</p>
        <p className="mt-1">
          El modo JSON es para usuarios avanzados. Asegúrate de que el formato
          sea válido según la estructura de filtros del backend. Los cambios
          desde el editor visual se perderán al cambiar a este modo.
        </p>
      </div>
    </div>
  );
}
