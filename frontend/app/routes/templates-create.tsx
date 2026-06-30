/**
 * Create Template Page
 * Página para crear una nueva plantilla
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

export default function CreateTemplatePage() {
  const navigate = useNavigate();

  const handleSubmit = () => {
    // TODO: Implementar creación de plantilla
    void navigate("/templates");
  };

  return (
    <PageLayout title="Nueva Plantilla">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Crear Nueva Plantilla</CardTitle>
            <CardDescription>
              Crea una plantilla reutilizable para reportes y documentos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Formulario de creación de plantilla en desarrollo...
              </p>
              <div className="flex gap-4 justify-center mt-6">
                <Button onClick={() => void handleSubmit()}>
                  Crear Plantilla
                </Button>
                <Button
                  variant="outline"
                  onClick={() => void navigate("/templates")}
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
