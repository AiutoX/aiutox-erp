/**
 * Widget registry + preference API types — aligned with backend
 * app/core/widgets/schemas.py
 */

export interface WidgetManifestOut {
  widget_id: string;
  label: string;
  description: string;
  frontend_component: string;
  required_tier: string;
  width: number;
  height: number;
  config_schema: Record<string, unknown> | null;
  permission: string | null;
  href: string | null;
  accent_color: string | null;
  quick_actions: Array<Record<string, string>> | null;
  default_enabled: boolean;
  data_endpoint: string;
  /** i18n keys; fall back to `label`/`description` when unset or missing. */
  label_key?: string | null;
  description_key?: string | null;
}

export interface WidgetPreferenceOut {
  id: string;
  tenant_id: string;
  user_id: string;
  widget_id: string;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  settings_json: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface WidgetPreferenceBatchItem {
  widget_id: string;
  position_x?: number;
  position_y?: number;
  width?: number;
  height?: number;
  settings_json?: Record<string, unknown> | null;
}
