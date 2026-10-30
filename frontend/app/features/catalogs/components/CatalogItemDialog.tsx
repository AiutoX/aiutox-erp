/**
 * CatalogItemDialog -- the shared dialog to relabel an item ("edit") and to
 * add a tenant item ("add") (ISSUE-037, AC-UI-23/24).
 *
 * Both modes: Español / English inputs with `n/100` counters and
 * react-hook-form + zod validation (RULE-003: required after trim, at most
 * 100 characters, no `<`/`>`); "Requerido" appears on blur (`onTouched`). A
 * 422 `CATALOG_LABELS_INVALID` maps `details.field` to the matching input.
 * Save is disabled -- and a second submit ignored -- while the request is in
 * flight, and the dialog cannot be dismissed meanwhile.
 *
 * - edit: title "Editar elemento", the catalog label as subtitle, a
 *   read-only Código and, on system items, the "code does not change" note.
 *   Saves through `useUpdateCatalogItem` with `{ labels }` only; that hook
 *   does not toast a labels update, so this dialog toasts "Etiqueta
 *   actualizada" (or the generic item-update error) itself.
 * - add: title "Agregar elemento", subtitle "<catalog> · solo visible para tu
 *   organización", Código "(se genera automáticamente)" with the live
 *   `previewTenantCode` preview over `existingCodes` and a note that the
 *   server's code is final. Saves through `useAddCatalogItem`, which owns the
 *   toasts; a 409 `CATALOG_LIST_NOT_EXTENSIBLE` closes the dialog, every
 *   other failure keeps it open with the labels as typed.
 *
 * The caller mounts it while open (so every opening starts from fresh form
 * state) and unmounts it on `onOpenChange(false)`.
 *
 * AiutoX ERP Core -- Frankpach
 */

import { useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { showToast } from "~/components/common/Toast";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { resolveLabel } from "~/lib/catalogs";
import { useTranslation } from "~/lib/i18n/useTranslation";
import {
  CATALOG_LIST_NOT_EXTENSIBLE_CODE,
  useAddCatalogItem,
} from "../hooks/useAddCatalogItem";
import { useReturnFocus } from "../hooks/useReturnFocus";
import { useUpdateCatalogItem } from "../hooks/useUpdateCatalogItem";
import { getApiErrorCode } from "../hooks/useUpdateGovernance";
import {
  getLabelFieldError,
  LABEL_ERROR_KEYS,
  type LabelLanguage,
} from "../lib/labelFieldError";
import { previewTenantCode } from "../lib/previewTenantCode";
import type {
  CatalogAdminItem,
  CatalogListAdmin,
} from "../types/catalogsAdmin.types";

/** RULE-003 / backend `_MAX_LABEL_LENGTH`. */
export const ITEM_LABEL_MAX_LENGTH = 100;

const LABEL_FIELDS: { language: LabelLanguage; labelKey: string }[] = [
  { language: "es", labelKey: "catalogs.admin.items.spanishColumn" },
  { language: "en", labelKey: "catalogs.admin.items.englishColumn" },
];

const NO_CODES: ReadonlySet<string> = new Set();

type ItemLabelsForm = Record<LabelLanguage, string>;

export interface CatalogItemDialogProps {
  mode: "edit" | "add";
  list: CatalogListAdmin;
  /** The item to relabel; required in edit mode, ignored in add mode. */
  item?: CatalogAdminItem | null;
  /** Add mode: the codes already loaded, for the preview's collision suffix. */
  existingCodes?: ReadonlySet<string>;
  /** Defaults to true: the caller mounts the dialog while it is open. */
  open?: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CatalogItemDialog({
  mode,
  list,
  item,
  existingCodes = NO_CODES,
  open = true,
  onOpenChange,
}: CatalogItemDialogProps) {
  const { t, language } = useTranslation();
  const updateItem = useUpdateCatalogItem(list.key);
  const addItem = useAddCatalogItem(list.key);
  const isEdit = mode === "edit";
  const isPending = isEdit ? updateItem.isPending : addItem.isPending;
  // No DialogTrigger: return focus to "Agregar elemento" or the row menu (AC-UI-28).
  const returnFocus = useReturnFocus(open);

  const schema = useMemo(() => {
    const label = z
      .string()
      .refine((value) => value.trim().length > 0, {
        message: t(LABEL_ERROR_KEYS.required),
      })
      .refine((value) => value.trim().length <= ITEM_LABEL_MAX_LENGTH, {
        message: t(LABEL_ERROR_KEYS.tooLong),
      })
      .refine((value) => !/[<>]/.test(value), {
        message: t(LABEL_ERROR_KEYS.html),
      });
    return z.object({ es: label, en: label });
  }, [t]);

  const form = useForm<ItemLabelsForm>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: {
      es: (isEdit ? item?.labels.es : undefined) ?? "",
      en: (isEdit ? item?.labels.en : undefined) ?? "",
    },
  });
  const [esValue = "", enValue = ""] = useWatch({
    control: form.control,
    name: ["es", "en"],
  });

  const close = () => onOpenChange(false);

  const handleOpenChange = (next: boolean) => {
    if (!next && isPending) return;
    onOpenChange(next);
  };

  /** Shows a 422 label error under its input; false when the error is not one. */
  const showFieldError = (error: unknown): boolean => {
    const fieldError = getLabelFieldError(error);
    if (!fieldError) return false;
    form.setError(
      fieldError.language,
      { type: "server", message: t(fieldError.messageKey) },
      { shouldFocus: true }
    );
    return true;
  };

  const submit = (values: ItemLabelsForm) => {
    if (isPending) return;
    const labels = { es: values.es.trim(), en: values.en.trim() };

    if (isEdit) {
      if (!item) return;
      // Nothing changed (compared trimmed, as the server compares): close
      // without a request, so no success toast claims an update happened
      // (phase 250 walkthrough, RUTA-44).
      const unchanged =
        labels.es === (item.labels.es ?? "").trim() &&
        labels.en === (item.labels.en ?? "").trim();
      if (unchanged) {
        close();
        return;
      }
      updateItem.mutate(
        { code: item.code, labels },
        {
          onSuccess: () => {
            showToast(
              t("catalogs.admin.itemDialog.editSuccessToast"),
              "success"
            );
            close();
          },
          onError: (error) => {
            if (showFieldError(error)) return;
            showToast(t("catalogs.admin.items.updateErrorToast"), "error");
          },
        }
      );
      return;
    }

    addItem.mutate(
      { labels },
      {
        onSuccess: close,
        onError: (error) => {
          if (showFieldError(error)) return;
          if (getApiErrorCode(error) === CATALOG_LIST_NOT_EXTENSIBLE_CODE) {
            close();
          }
        },
      }
    );
  };

  const catalogLabel = resolveLabel(list.labels, language, list.key);
  const code = isEdit
    ? (item?.code ?? "")
    : previewTenantCode({ es: esValue, en: enValue }, existingCodes);
  const counters: ItemLabelsForm = { es: esValue, en: enValue };
  const codeInputId = `catalog-item-dialog-code-${list.key}`;
  const codeNoteId = `${codeInputId}-note`;
  const codeNote = isEdit
    ? item?.is_system
      ? t("catalogs.admin.itemDialog.systemCodeNote")
      : null
    : t("catalogs.admin.itemDialog.previewHelper");

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        data-testid="catalog-item-dialog"
        data-mode={mode}
        onCloseAutoFocus={returnFocus}
      >
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? t("catalogs.admin.itemDialog.editTitle")
              : t("catalogs.admin.itemDialog.addTitle")}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? catalogLabel
              : `${catalogLabel} ${t("catalogs.admin.itemDialog.addSubtitle")}`}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            noValidate
            className="space-y-4"
            onSubmit={(event) => void form.handleSubmit(submit)(event)}
          >
            {LABEL_FIELDS.map(({ language: fieldLanguage, labelKey }) => (
              <FormField
                key={fieldLanguage}
                control={form.control}
                name={fieldLanguage}
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between gap-2">
                      <FormLabel>{t(labelKey)}</FormLabel>
                      <span
                        className="text-xs text-muted-foreground"
                        data-testid={`catalog-item-dialog-counter-${fieldLanguage}`}
                      >
                        {`${counters[fieldLanguage].length}/${ITEM_LABEL_MAX_LENGTH}`}
                      </span>
                    </div>
                    <FormControl>
                      <Input
                        {...field}
                        lang={fieldLanguage}
                        maxLength={ITEM_LABEL_MAX_LENGTH}
                        autoComplete="off"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
            <div className="space-y-2">
              <Label htmlFor={codeInputId}>
                {t("catalogs.admin.items.codeColumn")}
                {!isEdit && (
                  <span className="ml-1 font-normal text-muted-foreground">
                    {t("catalogs.admin.itemDialog.codeAutoHint")}
                  </span>
                )}
              </Label>
              <Input
                id={codeInputId}
                value={code}
                readOnly
                aria-describedby={codeNote ? codeNoteId : undefined}
                className="bg-muted font-mono"
                data-testid="catalog-item-dialog-code"
              />
              {codeNote && (
                <p id={codeNoteId} className="text-xs text-muted-foreground">
                  {codeNote}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={close}
              >
                {t("catalogs.admin.itemDialog.cancelButton")}
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && (
                  <Loader2
                    className="mr-2 h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                )}
                {t("catalogs.admin.itemDialog.saveButton")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
