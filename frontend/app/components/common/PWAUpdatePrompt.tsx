import { useEffect, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

export function PWAUpdatePrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // ✅ Solo ejecutar useRegisterSW en el cliente
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(registration) {
      if (isClient) {
        console.log("Service Worker registrado:", registration);
      }
    },
    onRegisterError(error) {
      if (isClient) {
        console.error("Error al registrar Service Worker:", error);
      }
    },
  });

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (needRefresh && isClient) {
      setShowPrompt(true);
    }
  }, [needRefresh, isClient]);

  if (!showPrompt || !isClient) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-sm z-50 border border-gray-200">
      <div className="flex flex-col gap-3">
        <div>
          <h3 className="font-semibold text-gray-900">
            Nueva versión disponible
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Hay una nueva versión de AiutoX ERP disponible. Actualiza para
            obtener las últimas mejoras.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              updateServiceWorker(true);
              setShowPrompt(false);
            }}
            className="flex-1 bg-[#3C3A47] text-white px-4 py-2 rounded-md hover:bg-[#2C2A37] transition-colors"
          >
            Actualizar
          </button>
          <button
            onClick={() => {
              setShowPrompt(false);
              setNeedRefresh(false);
            }}
            className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors"
          >
            Más tarde
          </button>
        </div>
      </div>
    </div>
  );
}
