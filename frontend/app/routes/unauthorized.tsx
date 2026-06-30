/**
 * Unauthorized Page (403)
 * Public page shown when user doesn't have required permissions
 */

import { useNavigate } from "react-router";
import { ErrorPage } from "~/components/public/ErrorPage";

export function meta() {
  return [
    { title: "Acceso Denegado - AiutoX ERP" },
    {
      name: "description",
      content: "No tienes permisos para acceder a esta página",
    },
  ];
}

export default function UnauthorizedPage() {
  const navigate = useNavigate();

  return (
    <ErrorPage
      code={403}
      title="Acceso Denegado"
      message="No tienes permisos para acceder a esta página. Si crees que esto es un error, contacta al administrador del sistema."
      actionLabel="Volver"
      actionOnClick={() => void navigate(-1)}
    />
  );
}
