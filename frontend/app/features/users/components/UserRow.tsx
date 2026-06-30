/**
 * Memoized User Row Component
 *
 * Optimized row component to reduce re-renders
 * Prefetches user data on hover for faster navigation
 */

import { memo } from "react";
import { Link } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { getUser } from "../api/users.api";
import { userKeys } from "../hooks/useUsers";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Shield,
  CheckSquare,
  Square,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { useTranslation } from "~/lib/i18n/useTranslation";
import type { User } from "../types/user.types";

interface UserRowProps {
  user: User;
  onDelete: (userId: string) => void;
  deleting: boolean;
  selected?: boolean;
  onSelect?: () => void;
}

export const UserRow = memo(
  ({ user, onDelete, deleting, selected = false, onSelect }: UserRowProps) => {
    UserRow.displayName = "UserRow";
    const { t } = useTranslation();
    const queryClient = useQueryClient();

    // Prefetch user data on hover for faster navigation
    const handleMouseEnter = () => {
      void queryClient.prefetchQuery({
        queryKey: userKeys.detail(user.id),
        queryFn: () => getUser(user.id),
        staleTime: 1000 * 60 * 5, // 5 minutes
      });
    };

    return (
      <tr
        className="border-b hover:bg-muted/50"
        onMouseEnter={handleMouseEnter}
      >
        <td className="px-4 py-3 text-sm">
          {onSelect && (
            <button
              onClick={onSelect}
              className="flex items-center justify-center"
              aria-label={
                selected
                  ? t("users.deselect") || "Deseleccionar"
                  : t("users.select") || "Seleccionar"
              }
            >
              {selected ? (
                <CheckSquare className="h-5 w-5 text-primary" />
              ) : (
                <Square className="h-5 w-5" />
              )}
            </button>
          )}
        </td>
        <td className="px-4 py-3 text-sm font-medium">{user.email}</td>
        <td className="px-4 py-3 text-sm hidden md:table-cell">
          {user.full_name ||
            `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
            "—"}
        </td>
        <td className="px-4 py-3 text-sm text-muted-foreground hidden lg:table-cell">
          {user.job_title || "—"}
        </td>
        <td className="px-4 py-3 text-sm">
          <span
            className={`inline-flex items-center rounded-full px-2 py-1 text-xs ${
              user.is_active
                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
            }`}
          >
            {user.is_active
              ? t("users.active") || "Activo"
              : t("users.inactive") || "Inactivo"}
          </span>
        </td>
        <td className="px-4 py-3 text-sm text-muted-foreground hidden xl:table-cell">
          {new Date(user.created_at).toLocaleDateString()}
        </td>
        <td className="px-4 py-3 text-right">
          <TooltipProvider>
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`${t("users.actions") || "Acciones"} para ${user.email}`}
                    >
                      <MoreVertical className="h-4 w-4" />
                      <span className="sr-only">
                        {t("users.actions") || "Acciones"}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t("users.actions") || "Acciones del usuario"}</p>
                </TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link
                    to={`/users/${user.id}`}
                    className="flex items-center gap-2"
                    aria-label={`${t("users.view") || "Ver"} usuario ${user.email}`}
                  >
                    <Eye className="h-4 w-4" />
                    {t("users.view") || "Ver"}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    to={`/users/${user.id}/edit`}
                    className="flex items-center gap-2"
                    aria-label={`${t("users.edit") || "Editar"} usuario ${user.email}`}
                  >
                    <Edit className="h-4 w-4" />
                    {t("users.edit") || "Editar"}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    to={`/users/${user.id}/roles`}
                    className="flex items-center gap-2"
                    aria-label={`${t("users.manageRoles") || "Gestionar Roles"} de ${user.email}`}
                  >
                    <Shield className="h-4 w-4" />
                    {t("users.manageRoles") || "Gestionar Roles"}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => void onDelete(user.id)}
                  disabled={deleting}
                  className="text-destructive focus:text-destructive"
                  aria-label={`${t("users.delete") || "Eliminar"} usuario ${user.email}`}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t("users.delete") || "Eliminar"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TooltipProvider>
        </td>
      </tr>
    );
  }
);
