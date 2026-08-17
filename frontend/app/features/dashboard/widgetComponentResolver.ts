/**
 * Widget component resolver — maps a WidgetManifest.frontend_component key to
 * its zero-props React component.
 *
 * Auto-discovery, not a hand-maintained map: every
 * `features/{module}/widgets/{Name}.tsx` file is globbed at build time and its
 * manifest key derived from its own path, mirroring the i18n convention in
 * `lib/i18n/translations/index.ts`. A module contributes a widget by placing a
 * component at that path and pointing its manifest's `frontend_component` at
 * the same key — no shared frontend file is edited (ARCH-001 FR-4).
 *
 * Each discovered file must default-export the component.
 */

import type { ComponentType } from "react";

type WidgetModule = { default?: ComponentType };

// Glob paths arrive relative to this file (e.g.
// "../real_estate/widgets/RealEstateDashboardWidget.tsx"), so match the
// module + component segments and rebuild the canonical manifest key.
const KEY_FROM_PATH = /([^/]+)\/widgets\/([^/]+)\.tsx$/;

function loadWidgetComponents(): Record<string, ComponentType> {
  const components: Record<string, ComponentType> = {};

  try {
    const files = import.meta.glob("../*/widgets/*.tsx", {
      eager: true,
    });

    for (const path in files) {
      const matches = path.match(KEY_FROM_PATH);
      if (!matches?.[1] || !matches[2]) continue;

      const component = (files[path] as WidgetModule).default;
      if (!component) {
        console.warn(
          `[widgets] ${path} has no default export — skipping. A widget file ` +
            `must default-export its component.`
        );
        continue;
      }

      components[`features/${matches[1]}/widgets/${matches[2]}`] = component;
    }
  } catch (error) {
    // Mirrors the i18n loader: if import.meta.glob is unavailable (non-Vite
    // context, e.g. some test runners) degrade to an empty map. Callers already
    // handle an unresolved key by rendering a labeled placeholder (FR-8).
    console.warn("[widgets] could not auto-discover widget components:", error);
  }

  return components;
}

const WIDGET_COMPONENT_MAP = loadWidgetComponents();

export function resolveWidgetComponent(
  frontendComponent: string
): ComponentType | undefined {
  return WIDGET_COMPONENT_MAP[frontendComponent];
}

/**
 * Every discovered widget key. Used by the manifest-validation test to assert
 * each declared `frontend_component` resolves.
 */
export function listResolvableWidgetKeys(): string[] {
  return Object.keys(WIDGET_COMPONENT_MAP);
}
