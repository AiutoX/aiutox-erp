/**
 * Template types for AiutoX ERP
 * Based on backend core/templates module
 */

export type TemplateType = "document" | "email" | "sms";

export type RenderFormat = "html" | "text" | "pdf";

export type TemplateRenderContext = Record<string, string | number | boolean>;

export interface TemplateCategory {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface TemplateVersion {
  id: string;
  template_id: string;
  version: number;
  name: string;
  subject?: string;
  content: string;
  variables: string[];
  created_by: string;
  created_at: string;
}

export interface Template {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  body: string;
  category?: string;
  category_id?: string;
  type?: TemplateType;
  subject?: string;
  content?: string;
  is_active: boolean;
  version: number;
  variables?: string[];
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type TemplateVariable = string;

export interface TemplateCreate {
  name: string;
  body?: string;
  description?: string;
  category?: string;
  category_id?: string;
  type?: TemplateType;
  subject?: string;
  content?: string;
  variables?: string[];
  is_active?: boolean;
  metadata?: Record<string, unknown>;
}

export interface TemplateUpdate {
  name?: string;
  body?: string;
  description?: string;
  category?: string;
  variables?: string[];
  is_active?: boolean;
  metadata?: Record<string, unknown>;
}

export interface RenderedTemplate {
  id: string;
  template_id: string;
  tenant_id: string;
  rendered_content: string;
  context: Record<string, unknown>;
  entity_type?: string;
  entity_id?: string;
  created_at: string;
}

export interface TemplateRenderRequest {
  context: Record<string, unknown>;
  entity_type?: string;
  entity_id?: string;
}

export interface TemplateListResponse {
  data: Template[];
  total: number;
  skip: number;
  limit: number;
}

export interface TemplateRenderResponse {
  rendered_content: string;
  rendered_template_id: string;
}
