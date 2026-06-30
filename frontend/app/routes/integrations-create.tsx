/**
 * Create Integration Page
 * Página para crear una nueva integración
 */

import { useNavigate } from "react-router";
import { PageLayout } from "~/components/layout/PageLayout";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

export default function CreateIntegrationPage() {
  const navigate = useNavigate();

  const handleSubmit = () => {
    // TODO: Implementar creación de integración
    void navigate("/config/integrations");
  };

  return (
    <PageLayout title="Nueva Integración">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Crear Nueva Integración</CardTitle>
            <CardDescription>
              Configura una nueva integración con servicios externos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Formulario de creación de integración en desarrollo...
              </p>
              <div className="flex gap-4 justify-center mt-6">
                <Button onClick={() => void handleSubmit()}>
                  Crear Integración
                </Button>
                <Button
                  variant="outline"
                  onClick={() => void navigate("/config/integrations")}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
