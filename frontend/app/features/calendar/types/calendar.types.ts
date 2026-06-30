/**
 * Calendar types for AiutoX ERP
 * Based on docs/40-modules/calendar.md
 */

// Calendar types
export interface Calendar {
  id: string;
  tenant_id: string;
  owner_id?: string | null;
  name: string;
  description?: string | null;
  color?: string | null;
  calendar_type: string;
  organization_id?: string | null;
  is_public: boolean;
  is_default: boolean;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

// Calendar creation payload
export interface CalendarCreate {
  name: string;
  calendar_type: string;
  description?: string;
  color?: string;
  organization_id?: string;
  is_public?: boolean;
  is_default?: boolean;
  metadata?: Record<string, unknown>;
}

// Calendar update payload
export interface CalendarUpdate {
  name?: string;
  description?: string;
  color?: string;
  is_public?: boolean;
  is_default?: boolean;
  metadata?: Record<string, unknown>;
}

// Calendar Event types
export interface CalendarEvent {
  id: string;
  tenant_id: string;
  calendar_id: string;
  title: string;
  description?: string | null;
  start_time: string;
  end_time: string;
  location?: string | null;
  all_day: boolean;
  status: string;

  // Simple recurrence fields (backward compatibility)
  recurrence_type: RecurrenceType;
  recurrence_end_date?: string | null;
  recurrence_count?: number | null;
  recurrence_interval: number;
  recurrence_days_of_week?: string | null;
  recurrence_day_of_month?: number | null;
  recurrence_month_of_year?: number | null;

  // Advanced recurrence (RFC5545 RRULE)
  recurrence_rule?: string | null;
  recurrence_exdates?: string[] | null;

  // Unified source fields
  source_type?: string | null;
  source_id?: string | null;

  // External integration fields
  provider?: string | null;
  external_id?: string | null;
  read_only: boolean;

  organizer_id?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

// Event creation payload
export interface EventCreate {
  calendar_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  location?: string;
  all_day?: boolean;
  status?: string;
  recurrence_type?: RecurrenceType;
  recurrence_end_date?: string;
  recurrence_count?: number;
  recurrence_interval?: number;
  recurrence_days_of_week?: string;
  recurrence_day_of_month?: number;
  recurrence_month_of_year?: number;
  metadata?: Record<string, unknown>;
}

// Event update payload
export interface EventUpdate {
  title?: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  all_day?: boolean;
  status?: string;
  recurrence_type?: RecurrenceType;
  recurrence_end_date?: string;
  recurrence_count?: number;
  recurrence_interval?: number;
  recurrence_days_of_week?: string;
  recurrence_day_of_month?: number;
  recurrence_month_of_year?: number;
  metadata?: Record<string, unknown>;
}

// Event recurrence
// Recurrence types
export type RecurrenceType = "none" | "daily" | "weekly" | "monthly" | "yearly";

// Event reminder
export interface EventReminder {
  id?: string;
  minutes_before: number;
  reminder_type: ReminderType;
}

// Reminder types
export type ReminderType = "email" | "in_app" | "push";

// Event attendee
export interface EventAttendee {
  id?: string;
  user_id?: string;
  email?: string;
  name?: string;
  status: AttendeeStatus;
}

// Attendee status
export type AttendeeStatus = "pending" | "accepted" | "declined" | "tentative";

// Calendar list parameters
export interface CalendarListParams {
  page?: number;
  page_size?: number;
  calendar_type?: string;
}

// Event list parameters
export interface EventListParams {
  page?: number;
  page_size?: number;
  calendar_id?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
}

// Event reminder creation payload
export interface EventReminderCreate {
  minutes_before: number;
  reminder_type: ReminderType;
}

// Event statistics
export interface CalendarStats {
  total_calendars: number;
  shared_calendars: number;
  total_events: number;
  upcoming_events: number;
  events_by_type: Record<string, number>;
}

// Resource types
export type ResourceType = "room" | "equipment" | "user";

export interface CalendarResource {
  id: string;
  tenant_id: string;
  calendar_id?: string | null;
  name: string;
  resource_type: ResourceType;
  description?: string | null;
  color?: string | null;
  capacity?: number | null;
  is_active: boolean;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface CalendarResourceCreate {
  calendar_id?: string | null;
  name: string;
  resource_type: ResourceType;
  description?: string | null;
  color?: string | null;
  capacity?: number | null;
  is_active?: boolean;
  metadata?: Record<string, unknown> | null;
}

export interface CalendarResourceUpdate {
  name?: string;
  resource_type?: ResourceType;
  description?: string | null;
  color?: string | null;
  capacity?: number | null;
  is_active?: boolean;
  metadata?: Record<string, unknown> | null;
}

export interface EventResource {
  id: string;
  tenant_id: string;
  event_id: string;
  resource_id: string;
  created_at: string;
}

export interface EventResourceCreate {
  resource_id: string;
}

export interface ResourceListParams {
  calendar_id?: string;
  resource_type?: ResourceType;
  is_active?: boolean;
  page?: number;
  page_size?: number;
}

// Calendar view types
export type CalendarViewType = "month" | "week" | "day" | "agenda";

// Calendar view configuration
export interface CalendarViewConfig {
  type: CalendarViewType;
  date: string;
  calendar_ids: string[];
  show_weekends: boolean;
  start_hour: number;
  end_hour: number;
}
