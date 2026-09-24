/**
 * ComingSoon - Placeholder for modules under development
 */
import { Clock } from "lucide-react";
import { ProtectedRoute } from "~/components/auth/ProtectedRoute";
import { PageLayout } from "~/components/layout/PageLayout";

interface ComingSoonProps {
  title: string;
  description?: string;
}

export function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <ProtectedRoute>
      <PageLayout title={title}>
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10">
            <Clock className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            {description ??
              "Este módulo está en desarrollo. Estará disponible próximamente."}
          </p>
        </div>
      </PageLayout>
    </ProtectedRoute>
  );
}
