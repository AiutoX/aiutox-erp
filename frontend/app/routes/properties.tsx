/**
 * Properties page
 * Main page for buildings and properties management
 */

import { useState } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { PageLayout } from "~/components/layout/PageLayout";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  BuildingList,
  BuildingForm,
  PropertyList,
  PropertyForm,
  PropertyDetail,
} from "~/features/real_estate/properties/components";
import {
  useCreateBuilding,
  useUpdateBuilding,
  useCreateProperty,
  useUpdateProperty,
  useProperty,
} from "~/features/real_estate/properties/hooks";
import type {
  Building,
  BuildingCreate,
  BuildingUpdate,
  Property,
  PropertyCreate,
  PropertyUpdate,
} from "~/features/real_estate/properties/api/properties.api";

export default function PropertiesPage() {
  const { t } = useTranslation();

  // Tab state
  const [currentTab, setCurrentTab] = useState("buildings");

  // Building dialog state
  const [showBuildingDialog, setShowBuildingDialog] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(
    null
  );

  // Property dialog state
  const [showPropertyDialog, setShowPropertyDialog] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [detailPropertyId, setDetailPropertyId] = useState<string | null>(null);
  const [selectedBuildingFilter, setSelectedBuildingFilter] = useState<Building | null>(null);

  // Fetch fresh property data when editing
  const { data: selectedPropertyData, isLoading: isLoadingProperty } =
    useProperty(selectedPropertyId);
  const selectedProperty = selectedPropertyData?.data ?? null;

  // Mutations
  const createBuildingMutation = useCreateBuilding();
  const updateBuildingMutation = useUpdateBuilding(selectedBuilding?.id ?? "");
  const createPropertyMutation = useCreateProperty();
  const updatePropertyMutation = useUpdateProperty(selectedPropertyId ?? "");

  // ─── Building handlers ────────────────────────────────────────────────────

  const handleCreateBuilding = () => {
    setSelectedBuilding(null);
    setShowBuildingDialog(true);
  };

  const handleEditBuilding = (building: Building) => {
    setSelectedBuilding(building);
    setShowBuildingDialog(true);
  };

  const handleBuildingSubmit = async (
    data: BuildingCreate | BuildingUpdate
  ) => {
    if (selectedBuilding) {
      await updateBuildingMutation.mutateAsync(data);
    } else {
      await createBuildingMutation.mutateAsync(data as BuildingCreate);
    }
    setShowBuildingDialog(false);
    setSelectedBuilding(null);
  };

  // ─── Property handlers ────────────────────────────────────────────────────

  const handleCreateProperty = () => {
    setSelectedPropertyId(null);
    setShowPropertyDialog(true);
  };

  const handleEditProperty = (property: Property) => {
    setSelectedPropertyId(property.id);
    setShowPropertyDialog(true);
  };

  const handleViewProperty = (property: Property) => {
    setDetailPropertyId(property.id);
    setCurrentTab("detail");
  };

  const handlePropertySubmit = async (
    data: PropertyCreate | PropertyUpdate
  ) => {
    try {
      if (selectedProperty) {
        await updatePropertyMutation.mutateAsync(data);
      } else {
        await createPropertyMutation.mutateAsync(data as PropertyCreate);
      }
      setShowPropertyDialog(false);
      setSelectedPropertyId(null);
    } catch {
      // Dialog stays open; TanStack Query exposes the error via mutation.error
    }
  };

  const handleBackToList = () => {
    setCurrentTab("properties");
    setDetailPropertyId(null);
  };

  return (
    <PageLayout
      title={t("properties.title")}
      description={t("properties.description")}
    >
      <div className="space-y-6">
        <Tabs value={currentTab} onValueChange={setCurrentTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="buildings">
              {t("properties.tabs.buildings")}
            </TabsTrigger>
            <TabsTrigger value="properties">
              {t("properties.tabs.properties")}
            </TabsTrigger>
            <TabsTrigger value="detail" disabled={!detailPropertyId}>
              {t("properties.tabs.detail")}
            </TabsTrigger>
          </TabsList>

          {/* Buildings tab */}
          <TabsContent value="buildings" className="space-y-4">
            <BuildingList
              onEdit={handleEditBuilding}
              onView={(building) => {
                setSelectedBuildingFilter(building);
                setCurrentTab("properties");
              }}
              onCreate={handleCreateBuilding}
            />
          </TabsContent>

          {/* Properties tab */}
          <TabsContent value="properties" className="space-y-4">
            <PropertyList
              buildingFilter={selectedBuildingFilter}
              onEdit={handleEditProperty}
              onView={handleViewProperty}
              onCreate={handleCreateProperty}
            />
          </TabsContent>

          {/* Detail tab */}
          <TabsContent value="detail" className="space-y-4">
            {detailPropertyId && (
              <PropertyDetail
                propertyId={detailPropertyId}
                onEdit={handleEditProperty}
                onBack={handleBackToList}
              />
            )}
          </TabsContent>
        </Tabs>

        {/* Building Dialog */}
        <Dialog open={showBuildingDialog} onOpenChange={setShowBuildingDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedBuilding ? t("buildings.edit") : t("buildings.create")}
              </DialogTitle>
            </DialogHeader>
            <BuildingForm
              building={selectedBuilding ?? undefined}
              onSubmit={handleBuildingSubmit}
              onCancel={() => {
                setShowBuildingDialog(false);
                setSelectedBuilding(null);
              }}
              loading={
                createBuildingMutation.isPending ||
                updateBuildingMutation.isPending
              }
            />
          </DialogContent>
        </Dialog>

        {/* Property Dialog */}
        <Dialog open={showPropertyDialog} onOpenChange={setShowPropertyDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedPropertyId
                  ? t("properties.edit")
                  : t("properties.create")}
              </DialogTitle>
            </DialogHeader>
            {selectedPropertyId && (isLoadingProperty || !selectedProperty) ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                {t("properties.loading")}
              </div>
            ) : (
              <PropertyForm
                property={selectedProperty ?? undefined}
                onSubmit={handlePropertySubmit}
                onCancel={() => {
                  setShowPropertyDialog(false);
                  setSelectedPropertyId(null);
                }}
                loading={
                  createPropertyMutation.isPending ||
                  updatePropertyMutation.isPending
                }
                error={
                  (createPropertyMutation.error)?.message ??
                  (updatePropertyMutation.error)?.message ??
                  null
                }
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </PageLayout>
  );
}
