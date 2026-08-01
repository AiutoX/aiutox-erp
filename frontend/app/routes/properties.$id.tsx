/**
 * Property detail page
 * Standalone page for a single property (direct URL access)
 */

import { useParams, useNavigate } from "react-router";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { PageLayout } from "~/components/layout/PageLayout";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { PropertyDetail } from "~/features/real_estate/properties/components/PropertyDetail";
import { PropertyForm } from "~/features/real_estate/properties/components/PropertyForm";
import { useUpdateProperty } from "~/features/real_estate/properties/hooks/useProperties";
import { useState } from "react";
import type {
  Property,
  PropertyUpdate,
} from "~/features/real_estate/properties/api/properties.api";

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);

  const updatePropertyMutation = useUpdateProperty(id ?? "");

  const handleEdit = (property: Property) => {
    setEditingProperty(property);
    setShowEditDialog(true);
  };

  const handleEditSubmit = async (data: PropertyUpdate) => {
    if (!id) return;
    await updatePropertyMutation.mutateAsync(data);
    setShowEditDialog(false);
    setEditingProperty(null);
  };

  if (!id) {
    return null;
  }

  return (
    <PageLayout
      title={t("properties.title")}
      description={t("properties.description")}
    >
      <PropertyDetail
        propertyId={id}
        onEdit={handleEdit}
        onBack={() => navigate("/properties")}
      />

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("properties.edit")}</DialogTitle>
          </DialogHeader>
          <PropertyForm
            property={editingProperty ?? undefined}
            onSubmit={handleEditSubmit}
            onCancel={() => {
              setShowEditDialog(false);
              setEditingProperty(null);
            }}
            loading={updatePropertyMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
