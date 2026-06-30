export const translations = {
  notifications: {
    title: "Centro de Notificaciones",
    description: "Gestiona y monitorea todas tus notificaciones en tiempo real",

    // Status & Connection
    status: {
      connected: "Conectado en tiempo real",
      disconnected: "Desconectado",
      pending: "Pendiente",
      sent: "Enviado",
      failed: "Error",
    },

    // Actions
    action: {
      reconnect: "Reconectar",
      retry: "Reintentar",
      delete: "Eliminar",
      markAsRead: "Marcar como leído",
      markAllAsRead: "Marcar todos como leídos",
      clear: "Limpiar",
      settings: "Configuración",
    },

    // Channels
    channel: {
      email: "Correo",
      sms: "SMS",
      inApp: "En la App",
      webhook: "Webhook",
      push: "Push",
    },

    // Tabs
    tabs: {
      queue: "Cola de Notificaciones",
      preferences: "Preferencias",
      templates: "Plantillas",
      history: "Historial",
    },

    // Queue
    queue: {
      loadError: "Error al cargar la cola de notificaciones",
      totalDesc: "Total de notificaciones",
      pendingDesc: "Notificaciones pendientes",
      sentDesc: "Notificaciones enviadas",
      failedDesc: "Notificaciones fallidas",
      noTemplate: "Sin plantilla",
      notSentYet: "Aún no enviado",
      dataPreview: "Datos de Notificación",
      errorMessage: "Mensaje de Error",
      view: "Ver",
      resend: "Reenviar",
    },

    // Statistics
    stats: {
      total: "Total",
      pending: "Pendientes",
      sent: "Enviadas",
      failed: "Fallidas",
      today: "Hoy",
      thisWeek: "Esta Semana",
      thisMonth: "Este Mes",
    },

    // Filters
    filter: {
      search: "Buscar por evento o destinatario...",
      allChannels: "Todos los Canales",
      allStatus: "Todos los Estados",
      byDate: "Por Fecha",
      byChannel: "Por Canal",
      byStatus: "Por Estado",
    },

    // Fields
    field: {
      id: "ID",
      event: "Evento",
      recipient: "Destinatario",
      channel: "Canal",
      status: "Estado",
      created: "Creado",
      sent: "Enviado",
      error: "Error",
      subject: "Asunto",
      body: "Contenido",
      data: "Datos",
      template: "Plantilla",
    },

    // States
    state: {
      loading: "Cargando notificaciones...",
      empty: "No hay notificaciones que mostrar",
      error: "Error al cargar notificaciones",
      retrying: "Reintentando...",
      noResults: "Sin resultados para este filtro",
    },

    // Preferences
    preferences: {
      title: "Preferencias de Notificaciones",
      description: "Configura cómo y cuándo deseas recibir notificaciones",
      coming:
        "Las preferencias personalizadas estarán disponibles próximamente",

      // Channel settings
      emailNotifications: "Notificaciones por Correo",
      smsNotifications: "Notificaciones por SMS",
      inAppNotifications: "Notificaciones en la App",
      pushNotifications: "Notificaciones Push",

      // Frequency
      frequency: "Frecuencia",
      immediately: "Inmediatamente",
      daily: "Diario",
      weekly: "Semanal",
      never: "Nunca",

      // Email settings
      emailAddress: "Dirección de Correo",
      emailDigest: "Resumen de Correo",

      // Quiet hours
      quietHours: "Horas Silenciosas",
      quietHoursStart: "Hora de Inicio",
      quietHoursEnd: "Hora de Fin",
      quietHoursDescription: "No recibir notificaciones durante estas horas",
    },

    // Messages
    message: {
      connectionLost: "Conexión perdida. Reconectando...",
      reconnectSuccess: "Reconectado correctamente",
      reconnectFailed: "No se pudo reconectar. Intenta más tarde.",
      deleteSuccess: "Notificación eliminada",
      deleteFailed: "Error al eliminar notificación",
      markAsReadSuccess: "Notificación marcada como leída",
      markAsReadFailed: "Error al marcar como leída",
    },

    // Templates
    templates: {
      count: "plantillas",
      create: "Nueva Plantilla",
      edit: "Editar Plantilla",
      createDescription: "Crea una nueva plantilla de notificación",
      editDescription: "Modifica la plantilla existente",
      empty: "No hay plantillas configuradas",
      active: "Activa",
      inactive: "Inactiva",
      name: "Nombre",
      namePlaceholder: "ej. Aviso de cobro",
      eventType: "Tipo de Evento",
      channel: "Canal",
      subject: "Asunto",
      subjectPlaceholder: "Asunto del mensaje...",
      body: "Contenido",
      bodyPlaceholder: "Cuerpo del mensaje. Usa {{variable}} para variables.",
      deleteTitle: "Eliminar Plantilla",
      deleteConfirm: "¿Eliminar la plantilla",
      created: "Plantilla creada",
      updated: "Plantilla actualizada",
      deleted: "Plantilla eliminada",
      error: "Error al guardar la plantilla",
      validationError: "Completa nombre, tipo de evento y contenido",
    },

    // Common
    common: {
      back: "Volver",
      cancel: "Cancelar",
      save: "Guardar",
      delete: "Eliminar",
      close: "Cerrar",
      loading: "Cargando...",
      saving: "Guardando...",
      deleting: "Eliminando...",
      refresh: "Actualizar",
      noData: "Sin datos",
      error: "Error",
    },
  },
};
