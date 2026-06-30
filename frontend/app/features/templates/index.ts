// API
export * from "./api/templates.api";

// Hooks
export * from "./hooks/useTemplates";

// Types
export type {
  Template,
  TemplateCreate,
  TemplateUpdate,
  TemplateVariable,
  RenderedTemplate,
  TemplateRenderRequest,
  TemplateRenderResponse,
  TemplateListResponse,
} from "./types/template.types";

// Components
export * from "./components";

// i18n
export { translations as templatesTranslations } from "./i18n/en";
