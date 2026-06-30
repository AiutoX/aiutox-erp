/**
 * MultiSelect Component
 * Allows selecting multiple items from a list with checkboxes
 */

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "./button";
import { Checkbox } from "./checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";
import { Badge } from "./badge";
import { Input } from "./input";

interface MultiSelectProps<T extends string> {
  options: { value: T; label: string }[];
  selected: T[];
  onChange: (selected: T[]) => void;
  placeholder?: string;
  className?: string;
  label?: string;
}

export function MultiSelect<T extends string>({
  options,
  selected,
  onChange,
  placeholder = "Seleccionar...",
  className,
  label,
}: MultiSelectProps<T>) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(search.toLowerCase())
  );

  const handleUnselect = (item: T) => {
    onChange(selected.filter((i) => i !== item));
  };

  const handleToggle = (item: T) => {
    if (selected.includes(item)) {
      onChange(selected.filter((i) => i !== item));
    } else {
      onChange([...selected, item]);
    }
  };

  const handleSelectAll = () => {
    if (selected.length === filteredOptions.length) {
      onChange([]);
    } else {
      onChange(filteredOptions.map((o) => o.value));
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between",
              selected.length > 0 && "h-auto",
              className
            )}
          >
            <div className="flex flex-wrap gap-1">
              {selected.length === 0 && (
                <span className="text-sm text-muted-foreground">
                  {placeholder}
                </span>
              )}
              {selected.map((item) => (
                <Badge
                  key={item}
                  variant="secondary"
                  className="rounded-sm px-1 font-normal"
                >
                  {options.find((o) => o.value === item)?.label}
                  <span
                    className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleUnselect(item);
                      }
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleUnselect(item);
                    }}
                  >
                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </span>
                </Badge>
              ))}
            </div>
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{label || "Seleccionar opciones"}</DialogTitle>
            <DialogDescription>
              {selected.length} de {filteredOptions.length} seleccionados
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="flex items-center space-x-2">
              <Checkbox
                id="select-all"
                checked={
                  selected.length === filteredOptions.length &&
                  filteredOptions.length > 0
                }
                onCheckedChange={handleSelectAll}
              />
              <label
                htmlFor="select-all"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Seleccionar todos
              </label>
            </div>
            <div className="max-h-[300px] overflow-y-auto space-y-2">
              {filteredOptions.map((option) => (
                <div
                  key={option.value}
                  className="flex items-center space-x-2 p-2 hover:bg-accent rounded-md cursor-pointer"
                  onClick={() => handleToggle(option.value)}
                >
                  <Checkbox
                    checked={selected.includes(option.value)}
                    onCheckedChange={() => handleToggle(option.value)}
                  />
                  <span className="text-sm">{option.label}</span>
                </div>
              ))}
              {filteredOptions.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-4">
                  No se encontraron resultados
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
