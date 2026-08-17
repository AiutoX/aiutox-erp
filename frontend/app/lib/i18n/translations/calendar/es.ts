/**
 * Spanish translations for calendar module
 */

export const calendarEs = {
  // Recurrence
  recurrence: {
    title: "Recurrencia",
    type: "Tipo de recurrencia",
    none: "No se repite",
    daily: "Diariamente",
    weekly: "Semanalmente",
    monthly: "Mensualmente",
    yearly: "Anualmente",
    interval: "Repetir cada",
    days: "días",
    weeks: "semanas",
    months: "meses",
    years: "años",
    endsOn: "Termina el",
    noEndDate: "Sin fecha de fin",
    preview: "Próximas ocurrencias",
    andMore: "... y más",
    on: "en",
    and: "y",
    until: "hasta",
  },

  // Recurrence types (for dropdown)
  recurrenceTypes: {
    none: "Ninguna",
    daily: "Diaria",
    weekly: "Semanal",
    monthly: "Mensual",
    yearly: "Anual",
  },

  // Recurrence fields
  recurrenceType: "Tipo",
  recurrenceInterval: "Intervalo",
  recurrenceEndDate: "Fecha fin",
  recurrenceCount: "Repeticiones",

  // Weekdays
  weekdays: {
    sun: "Dom",
    mon: "Lun",
    tue: "Mar",
    wed: "Mié",
    thu: "Jue",
    fri: "Vie",
    sat: "Sáb",
  },

  // Quick Edit
  quickEdit: {
    title: "Edición rápida",
    openFull: "Editar completo",
    saved: "Evento actualizado",
    error: "Error al actualizar evento",
  },

  // Mobile
  mobile: {
    actions: "Acciones",
    view: "Ver detalles",
    edit: "Editar",
    quickEdit: "Edición rápida",
    move: "Mover",
    delete: "Eliminar",
    confirmDelete: "¿Eliminar este evento?",
  },

  // Resize
  resize: {
    invalid: "La fecha de inicio debe ser menor a la fecha de fin",
    taskNotResizable: "Las tareas solo se pueden mover, no redimensionar",
    minDuration: "La duración mínima es de 15 minutos",
  },

  // Existing translations (keep existing ones)
  views: {
    month: "Mes",
    week: "Semana",
    day: "Día",
    agenda: "Agenda",
  },
  today: "Hoy",
  loading: "Cargando calendario...",
  events: {
    create: "Crear Evento",
    edit: "Editar Evento",
    calendar: "Calendario",
    "calendar.placeholder": "Seleccionar calendario",
    title: "Título del Evento",
    "title.placeholder": "Título del evento",
    description: "Descripción",
    "description.placeholder": "Descripción del evento",
    start: "Hora de inicio",
    startTime: "Hora de inicio",
    end: "Hora de fin",
    endTime: "Hora de fin",
    location: "Ubicación",
    "location.placeholder": "Ubicación",
    allDay: "Todo el día",
    reminders: {
      title: "Recordatorios",
      add: "Agregar Recordatorio",
      add_first: "Agregar Primer Recordatorio",
      no_reminders: "No hay recordatorios configurados",
      at_start_time: "Al inicio del evento",
      minutes_before: "minutos antes",
      hours_before: "horas antes",
      days_before: "días antes",
      when: "Cuándo",
      type: "Tipo",
      types: {
        email: "Correo electrónico",
        in_app: "Notificación en la aplicación",
        push: "Notificación push",
      },
    },
    save: "Guardar",
    cancel: "Cancelar",
  },
  details: {
    edit: "Editar",
    delete: "Eliminar",
    close: "Cerrar",
    allDay: "Todo el día",
    recurrence: "Recurrencia",
  },
  labels: {
    more: "más",
  },
  // Additional translations
  newEvent: "Nuevo Evento",
  // Additional reminder translations
  reminders_minutes_before: "minutos antes",
  reminders_hours_before: "horas antes",
  reminders_days_before: "días antes",
  // Direct access keys for calendar
  "recurrence.title": "Recurrencia",
  "reminders.title": "Recordatorios",
  "events.allDay": "Todo el día",
  // Calendar reminders (complete structure for ReminderManager component)
  reminders: {
    title: "Recordatorios",
    when: "Cuándo",
    type: "Tipo",
    types: {
      email: "Correo electrónico",
      in_app: "Notificación en la aplicación",
      push: "Notificación push",
      in_advance: "Con antelación",
    },
    add: "Agregar Recordatorio",
    add_first: "Agregar Primer Recordatorio",
    no_reminders: "No hay recordatorios configurados",
    at_start_time: "Al inicio del evento",
    minutes_before: "minutos antes",
    hours_before: "horas antes",
    days_before: "días antes",
    delete: "Eliminar recordatorio",
    confirmDelete: "¿Eliminar este recordatorio?",
    limit: "Máximo 5 recordatorios por evento",
  },
};
