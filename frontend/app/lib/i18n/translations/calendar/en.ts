/**
 * English translations for calendar module
 */

export const calendarEn = {
  // Recurrence
  recurrence: {
    title: "Recurrence",
    type: "Recurrence type",
    none: "Does not repeat",
    daily: "Daily",
    weekly: "Weekly",
    monthly: "Monthly",
    yearly: "Yearly",
    interval: "Repeat every",
    days: "days",
    weeks: "weeks",
    months: "months",
    years: "years",
    endsOn: "Ends on",
    noEndDate: "No end date",
    preview: "Next occurrences",
    andMore: "... and more",
    on: "on",
    and: "and",
    until: "until",
  },

  // Recurrence types (for dropdown)
  recurrenceTypes: {
    none: "None",
    daily: "Daily",
    weekly: "Weekly",
    monthly: "Monthly",
    yearly: "Yearly",
  },

  // Recurrence fields
  recurrenceType: "Type",
  recurrenceInterval: "Interval",
  recurrenceEndDate: "End Date",
  recurrenceCount: "Occurrences",

  // Weekdays
  weekdays: {
    sun: "Sun",
    mon: "Mon",
    tue: "Tue",
    wed: "Wed",
    thu: "Thu",
    fri: "Fri",
    sat: "Sat",
  },

  // Quick Edit
  quickEdit: {
    title: "Quick Edit",
    openFull: "Edit full",
    saved: "Event updated",
    error: "Error updating event",
  },

  // Mobile
  mobile: {
    actions: "Actions",
    view: "View details",
    edit: "Edit",
    quickEdit: "Quick edit",
    move: "Move",
    delete: "Delete",
    confirmDelete: "Delete this event?",
  },

  // Resize
  resize: {
    invalid: "Start date must be before end date",
    taskNotResizable: "Tasks can only be moved, not resized",
    minDuration: "Minimum duration is 15 minutes",
  },

  // Existing translations (keep existing ones)
  views: {
    month: "Month",
    week: "Week",
    day: "Day",
    agenda: "Agenda",
  },
  today: "Today",
  loading: "Loading calendar...",
  events: {
    create: "Create Event",
    edit: "Edit Event",
    calendar: "Calendar",
    "calendar.placeholder": "Select calendar",
    title: "Event Title",
    "title.placeholder": "Event title",
    description: "Description",
    "description.placeholder": "Event description",
    start: "Start Time",
    startTime: "Start Time",
    end: "End Time",
    endTime: "End Time",
    location: "Location",
    "location.placeholder": "Location",
    allDay: "All Day",
    reminders: {
      title: "Reminders",
      add: "Add Reminder",
      add_first: "Add First Reminder",
      no_reminders: "No reminders configured",
      at_start_time: "At event start",
      minutes_before: "minutes before",
      hours_before: "hours before",
      days_before: "days before",
      when: "When",
      type: "Type",
      types: {
        email: "Email",
        in_app: "In-app notification",
        push: "Push notification",
      },
    },
    save: "Save",
    cancel: "Cancel",
  },
  details: {
    edit: "Edit",
    delete: "Delete",
    close: "Close",
    allDay: "All Day",
    recurrence: "Recurrence",
  },
  labels: {
    more: "more",
  },
  // Additional translations
  newEvent: "New Event",
  // Additional reminder translations
  reminders_minutes_before: "minutes before",
  reminders_hours_before: "hours before",
  reminders_days_before: "days before",
  // Direct access keys for calendar
  "recurrence.title": "Recurrence",
  "reminders.title": "Reminders",
  "events.allDay": "All Day",
  // Calendar reminders (complete structure for ReminderManager component)
  reminders: {
    title: "Reminders",
    when: "When",
    type: "Type",
    types: {
      email: "Email",
      in_app: "In-app notification",
      push: "Push notification",
      in_advance: "In advance",
    },
    add: "Add Reminder",
    add_first: "Add First Reminder",
    no_reminders: "No reminders configured",
    at_start_time: "At event start",
    minutes_before: "minutes before",
    hours_before: "hours before",
    days_before: "days before",
    delete: "Delete reminder",
    confirmDelete: "Delete this reminder?",
    limit: "Maximum 5 reminders per event",
  },
};
