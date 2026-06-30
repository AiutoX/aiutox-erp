/**
 * Not Found Page (404)
 * Public page shown when route doesn't exist
 */

import { ErrorPage } from "~/components/public/ErrorPage";

export function meta() {
  return [
    { title: "Página no encontrada - AiutoX ERP" },
    {
      name: "description",
      content: "La página que buscas no existe",
    },
  ];
}

export default function NotFoundPage() {
  return (
    <ErrorPage
      code={404}
      title="Página no encontrada"
      message="La página que buscas no existe o ha sido movida."
      actionLabel="Volver al inicio"
      actionHref="/login"
    />
  );
}
