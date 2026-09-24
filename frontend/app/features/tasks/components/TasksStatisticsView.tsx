/**
 * Tasks Statistics View
 * Main view for task statistics and reporting
 */

import { useState } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Badge } from "~/components/ui/badge";
import {
  BarChart3Icon,
  TrendingUpIcon,
  SettingsIcon,
  ZapIcon,
} from "lucide-react";

import { TasksOverviewWidget } from "../widgets/TasksOverviewWidget";
import { TasksTrendsWidget } from "../widgets/TasksTrendsWidget";
import { CustomStatesWidget } from "../widgets/CustomStatesWidget";
import { ProductivityWidget } from "../widgets/ProductivityWidget";
import { TimeFilterBar } from "./TimeFilterBar";
import type { TimeFilter } from "../api/statistics.api";

export function TasksStatisticsView() {
  const { t } = useTranslation();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>({});
  const [activeView, setActiveView] = useState("overview");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t("tasks.statistics.title")}</h2>
          <p className="text-muted-foreground">
            {t("tasks.statistics.description")}
          </p>
        </div>
        <Badge variant="outline" className="ml-auto">
          {t("tasks.statistics.realTime")}
        </Badge>
      </div>

      {/* Time Filter */}
      <TimeFilterBar value={timeFilter} onChange={setTimeFilter} />

      {/* View Tabs */}
      <Tabs value={activeView} onValueChange={setActiveView}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3Icon className="h-4 w-4" />
            {t("tasks.statistics.views.overview")}
          </TabsTrigger>
          <TabsTrigger value="trends" className="flex items-center gap-2">
            <TrendingUpIcon className="h-4 w-4" />
            {t("tasks.statistics.views.trends")}
          </TabsTrigger>
          <TabsTrigger value="custom" className="flex items-center gap-2">
            <SettingsIcon className="h-4 w-4" />
            {t("tasks.statistics.views.customStates")}
          </TabsTrigger>
          <TabsTrigger value="productivity" className="flex items-center gap-2">
            <ZapIcon className="h-4 w-4" />
            {t("tasks.statistics.views.productivity")}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TasksOverviewWidget timeFilter={timeFilter} />
            <ProductivityWidget timeFilter={timeFilter} />
          </div>

          {/* Additional overview widgets */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TasksTrendsWidget />
            <CustomStatesWidget />
          </div>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TasksTrendsWidget />
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUpIcon className="h-5 w-5" />
                  {t("tasks.statistics.periodComparison")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {["7d", "30d", "90d"].map((period) => (
                    <div
                      key={period}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                    >
                      <span className="font-medium">
                        {t(`tasks.statistics.periods.${period}`)}
                      </span>
                      <TasksTrendsWidget period={period} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Custom States Tab */}
        <TabsContent value="custom" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CustomStatesWidget />
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SettingsIcon className="h-5 w-5" />
                  {t("tasks.statistics.stateAnalysis")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  {t("tasks.statistics.comingSoon")}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Productivity Tab */}
        <TabsContent value="productivity" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ProductivityWidget timeFilter={timeFilter} />
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ZapIcon className="h-5 w-5" />
                  {t("tasks.statistics.performanceMetrics")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  {t("tasks.statistics.comingSoon")}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
