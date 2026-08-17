/**
 * BadgeList component
 * Lists gamification badges with admin actions (create/edit/deactivate)
 */

import { useState } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge as StatusBadge } from "~/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Search, Plus, Edit, Trash2 } from "lucide-react";
import type { Badge } from "~/features/gamification/api/gamification.api";

interface BadgeListProps {
  badges: Badge[];
  loading?: boolean;
  onEdit?: (badge: Badge) => void;
  onDeactivate?: (badge: Badge) => void;
  onCreate?: () => void;
}

export function BadgeList({
  badges,
  loading,
  onEdit,
  onDeactivate,
  onCreate,
}: BadgeListProps) {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredBadges = searchTerm
    ? badges.filter(
        (b) =>
          b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (b.description ?? "").toLowerCase().includes(searchTerm.toLowerCase())
      )
    : badges;

  const formatCriteria = (badge: Badge): string => {
    const eventType = (badge.criteria?.event_type as string) ?? "";
    const count = (badge.criteria?.count as number) ?? 0;
    return `${eventType} x${count}`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary" />
            <span>{t("gamification.badges.loading")}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{t("gamification.badges.title")}</h2>
        {onCreate && (
          <Button onClick={onCreate}>
            <Plus className="h-4 w-4 mr-2" />
            {t("gamification.badges.create")}
          </Button>
        )}
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>{t("gamification.badges.search.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder={t("gamification.badges.search.placeholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Badges table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("gamification.badges.list.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredBadges.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-muted-foreground mb-4">
                {t("gamification.badges.list.empty")}
              </div>
              {onCreate && (
                <Button onClick={onCreate} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  {t("gamification.badges.create")}
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("gamification.badges.fields.name")}</TableHead>
                  <TableHead>{t("gamification.badges.fields.icon")}</TableHead>
                  <TableHead>
                    {t("gamification.badges.fields.criteria")}
                  </TableHead>
                  <TableHead>
                    {t("gamification.badges.fields.pointsValue")}
                  </TableHead>
                  <TableHead>
                    {t("gamification.badges.fields.status")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("common.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBadges.map((badge) => (
                  <TableRow key={badge.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{badge.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {badge.description}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {badge.icon}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatCriteria(badge)}
                    </TableCell>
                    <TableCell>{badge.points_value}</TableCell>
                    <TableCell>
                      <StatusBadge
                        variant={badge.is_active ? "default" : "outline"}
                      >
                        {badge.is_active
                          ? t("gamification.badges.status.active")
                          : t("gamification.badges.status.inactive")}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-1">
                        {onEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit(badge)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {onDeactivate && badge.is_active && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDeactivate(badge)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
