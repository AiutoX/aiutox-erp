/**
 * Spanish translations for mentions module.
 */

export const translations = {
  mentions: {
    // Actions
    create: "Crear Mención",
    mention: "Mención",
    resolve: "Marcar como Leído",
    resolved: "Resuelto",
    unresolved: "No Resuelto",
    delete: "Eliminar Mención",
    deleteConfirm: "¿Eliminar esta mención?",
    deleteConfirmDescription: "Esta acción no se puede deshacer.",

    // Status
    empty: "Sin menciones aún",
    noMentions: "No tienes menciones",
    unreadCount: "{{count}} mención sin leer",
    unreadCountPlural: "{{count}} menciones sin leer",
    allRead: "Todas las menciones leídas",
    markAllAsRead: "Marcar todas como leídas",

    // Entity types
    inComment: "mencionado en un comentario",
    inTask: "mencionado en una tarea",
    inActivity: "mencionado en una actividad",
    inTemplate: "mencionado en una plantilla",

    // Labels
    mentionedBy: "Mencionado por {{user}}",
    createdAt: "Creado {{date}}",
    resolvedAt: "Resuelto {{date}}",
    from: "De",
    in: "En",
    user: "Usuario",
    entity: "Entidad",
    time: "Tiempo",
    status: "Estado",

    // Messages
    createSuccess: "Mención creada exitosamente",
    createError: "Error al crear la mención",
    resolveSuccess: "Mención marcada como leída",
    resolveError: "Error al marcar la mención como leída",
    deleteSuccess: "Mención eliminada exitosamente",
    deleteError: "Error al eliminar la mención",
    loadingError: "Error al cargar menciones",

    // Notification
    notify: "Enviar notificación",
    notificationSent: "Notificación enviada",
    notificationFailed: "Error al enviar notificación",
    mentionNotification: "{{user}} te mencionó",
    mentionNotificationBody: "Fuiste mencionado {{where}}",

    // Filters
    filter: "Filtrar",
    showResolved: "Mostrar resueltos",
    hideResolved: "Ocultar resueltos",
    showAll: "Mostrar todos",
    unresolvedOnly: "Solo no resueltos",

    // Sorting
    newestFirst: "Más nuevos primero",
    oldestFirst: "Más antiguos primero",
    unresolvedFirst: "No resueltos primero",

    // Permissions
    noPermission: "No tienes permiso para gestionar menciones",
    readError: "No se pueden leer menciones",
    writeError: "No se pueden crear o actualizar menciones",
    permissionDeleteError: "No se pueden eliminar menciones",

    // Placeholders
    searchPlaceholder: "Buscar menciones...",
    selectEntity: "Seleccionar tipo de entidad",

    // Details
    details: "Detalles de la Mención",
    view: "Ver Mención",
    edit: "Editar Mención",
    goToEntity: "Ir a {{entityType}}",

    // Batch actions
    batchResolve: "Marcar como leído",
    batchDelete: "Eliminar seleccionados",
    selectAll: "Seleccionar todos",
    noneSelected: "Sin menciones seleccionadas",

    // Error messages
    mentionYourself: "No puedes mencionarte a ti mismo",
    userNotFound: "Usuario no encontrado",
    entityNotFound: "Entidad no encontrada",
    alreadyMentioned: "El usuario ya fue mencionado en esta entidad",
  },
};
