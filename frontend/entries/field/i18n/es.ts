const fieldEs = {
  field: {
    app: {
      name: "AiutoX Field",
    },
    auth: {
      pinLogin: {
        title: "Ingresa tu PIN",
        subtitle: "Acceso Field App",
        enter: "Entrar",
        clear: "Borrar",
        usePassword: "Usar contraseña ERP",
        lockout: "Bloqueado por {{seconds}}s",
        attemptsRemaining: "{{count}} intento restante",
        attemptsRemaining_plural: "{{count}} intentos restantes",
        error: "PIN incorrecto",
      },
      pinSetup: {
        title: "Configura tu PIN de campo",
        subtitle: "Ingresa un PIN de 4 a 6 dígitos para acceder rápidamente",
        confirm: "Confirma tu PIN",
        save: "Guardar PIN",
        mismatch: "Los PINes no coinciden. Intenta de nuevo.",
        success: "PIN configurado correctamente",
      },
    },
    queue: {
      title: "Formularios disponibles",
      empty: "No hay formularios disponibles",
      emptyHelp: "Conéctate a internet para descargar formularios de campo.",
      summary: "{{downloaded}} de {{total}} descargados",
      refresh: "Actualizar",
      availableSection: "Disponibles",
      downloadedSection: "Descargados",
      download: "Descargar",
      open: "Abrir",
      removeDownload: "Eliminar descarga",
      downloading: "Descargando...",
      downloaded: "Descargado",
      updating: "Actualizando",
      available: "Disponible",
      expires: "Vence: {{date}}",
    },
    sync: {
      pending: "{{count}} pendiente",
      pending_plural: "{{count}} pendientes",
      synced: "Sincronizado",
      error: "Error de sync",
      syncing: "Sincronizando...",
      modalTitle: "Estado de sincronización",
      noItems: "Todo al día",
      forceSync: "Sincronizar ahora",
      close: "Cerrar",
      lastSyncAt: "Última sync: {{time}}",
      never: "Nunca",
      failedCount: "{{count}} con error",
    },
    settings: {
      title: "Configuración",
      oneQuestionMode: "Modo una pregunta a la vez",
      highContrast: "Modo alto contraste (luz solar)",
      changePIN: "Cambiar PIN",
      logout: "Cerrar sesión",
      version: "Versión",
    },
    renderer: {
      notFound: "Formulario no encontrado",
      notFoundHelp:
        "El formulario no está descargado. Vuelve a la lista para descargarlo.",
      backToList: "Volver a formularios",
      back: "Atrás",
      submit: "Enviar respuestas",
      allQuestions: "Ver todo",
      oneByOne: "Una a la vez",
      submitError:
        "Error al enviar. Tus respuestas se guardarán e intentarán sincronizar automáticamente.",
      successTitle: "Respuestas enviadas",
      successBody:
        "Tus respuestas se han guardado y se sincronizarán automáticamente cuando haya conexión.",
      prev: "Anterior",
      next: "Siguiente",
      finish: "Enviar",
      progress: "{{current}} de {{total}}",
    },
    form: {
      placeholderTitle: "Formulario de campo",
      placeholderBody:
        "Esta ruta queda reservada para el renderizador de formularios de la Phase F3.",
    },
    scanner: {
      modalTitle: "Escanear QR / Código de barras",
      videoLabel: "Vista previa de cámara",
      openButton: "Escanear código",
      cancel: "Cancelar",
      hint: "Apunta la cámara al código QR o código de barras",
      starting: "Iniciando cámara…",
      permissionDenied:
        "Permiso de cámara denegado. Activa el acceso a la cámara en la configuración del navegador.",
      errorGeneric: "No se pudo iniciar la cámara. Inténtalo de nuevo.",
    },
    gps: {
      accuracy: "±{{meters}} m de precisión",
      capturing: "Obteniendo ubicación…",
      recapture: "Re-capturar ubicación",
      manual: "Ingresar manualmente",
      skipToManual: "Omitir — ingresar coordenadas manualmente",
      useMyLocation: "Usar mi ubicación",
      latitude: "Latitud",
      longitude: "Longitud",
      errorPermission:
        "Permiso de ubicación denegado. Ingresa las coordenadas manualmente.",
      errorTimeout:
        "Tiempo de espera de ubicación agotado (10 s). Verifica tu señal GPS o ingresa manualmente.",
      errorUnavailable:
        "Ubicación no disponible. Ingresa las coordenadas manualmente.",
      errorNotSupported:
        "GPS no soportado en este dispositivo. Ingresa las coordenadas manualmente.",
    },
    nav: {
      forms: "Formularios",
      settings: "Configuración",
    },
  },
} as const;

export default fieldEs;
export type FieldTranslations = typeof fieldEs;
