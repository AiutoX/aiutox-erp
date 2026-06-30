/**
 * DataTable - Tabla de datos con paginación, filtros, sorting
 *
 * Componente reutilizable para mostrar datos en formato tabla
 * Nota: Para casos complejos, se puede extender o crear implementaciones específicas
 */

import type { ReactNode } from "react";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface DataTableColumn<T = unknown> {
  /** Clave única de la columna */
  key: string;
  /** Header de la columna */
  header: string;
  /** Función para renderizar el contenido de la celda */
  cell: (row: T) => ReactNode;
  /** Si la columna es ordenable */
  sortable?: boolean;
  /** Ancho de la columna (opcional) */
  width?: string;
}

export interface DataTableProps<T = unknown> {
  /** Columnas de la tabla */
  columns: DataTableColumn<T>[];
  /** Datos a mostrar */
  data: T[];
  /** Si está cargando */
  loading?: boolean;
  /** Estado vacío personalizado */
  emptyState?: ReactNode;
  /** Paginación actual */
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
  };
  /** Clases CSS adicionales */
  className?: string;
  /** Si mostrar dentro de un Card */
  inCard?: boolean;
  /** Acciones de la tabla (botones, etc.) */
  actions?: ReactNode;
}

/**
 * Tabla de datos genérica
 */
export function DataTable<T = unknown>({
  columns,
  data,
  loading = false,
  emptyState,
  pagination,
  className,
  inCard = true,
  actions,
}: DataTableProps<T>) {
  const totalPages = pagination
    ? Math.ceil(pagination.total / pagination.pageSize)
    : 0;

  const renderPagination = () => {
    if (!pagination) return null;

    return (
      <div className="flex items-center justify-between px-2 py-4">
        <div className="text-sm text-muted-foreground">
          Mostrando {(pagination.page - 1) * pagination.pageSize + 1} a{" "}
          {Math.min(pagination.page * pagination.pageSize, pagination.total)} de{" "}
          {pagination.total} resultados
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => pagination.onPageChange(pagination.page - 1)}
            disabled={pagination.page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>
          <span className="text-sm">
            Página {pagination.page} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => pagination.onPageChange(pagination.page + 1)}
            disabled={pagination.page >= totalPages}
          >
            Siguiente
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  const tableContent = (
    <div className={cn("space-y-4", className)}>
      {actions && (
        <div className="flex items-center justify-end">{actions}</div>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-muted animate-pulse rounded" />
          ))}
        </div>
      ) : data.length === 0 ? (
        emptyState || (
          <div className="py-12 text-center text-muted-foreground">
            No hay datos para mostrar
          </div>
        )
      ) : (
        <>
          <div className="rounded-md border overflow-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-muted/50">
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column.key}
                      className="px-4 py-3 text-left text-sm font-medium text-foreground whitespace-nowrap"
                      style={column.width ? { width: column.width } : undefined}
                    >
                      {column.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className="hover:bg-muted/50 transition-colors"
                  >
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className="px-4 py-3 text-sm whitespace-nowrap"
                      >
                        {column.cell(row)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {renderPagination()}
        </>
      )}
    </div>
  );

  if (inCard) {
    return (
      <Card>
        <CardHeader className={actions ? "pb-4" : "hidden"}>
          {actions && (
            <div className="flex items-center justify-end">{actions}</div>
          )}
        </CardHeader>
        <CardContent>{tableContent}</CardContent>
      </Card>
    );
  }

  return tableContent;
}
