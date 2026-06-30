/**
 * Theme Configuration Page
 *
 * Allows users to customize theme colors, logos, typography, and component styles
 * Uses ConfigPageLayout and shared components for visual consistency
 */

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { useThemeConfig } from "~/hooks/useThemeConfig";
import { showToast } from "~/components/common/Toast";
import { ConfigPageLayout } from "~/components/config/ConfigPageLayout";
import { ConfigColorInput } from "~/components/config/ConfigColorInput";
import { ConfigFormField } from "~/components/config/ConfigFormField";
import { ConfigSection } from "~/components/config/ConfigSection";
import { ConfigLoadingState } from "~/components/config/ConfigLoadingState";
import { ConfigErrorState } from "~/components/config/ConfigErrorState";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Card, CardContent } from "~/components/ui/card";
import { useConfigForm } from "~/hooks/useConfigForm";

interface ThemeConfigValues extends Record<string, string> {
  // Main colors
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  surface_color: string;
  dark_primary_color: string;
  dark_secondary_color: string;
  dark_accent_color: string;
  dark_background_color: string;
  dark_surface_color: string;
  // Status colors
  error_color: string;
  warning_color: string;
  success_color: string;
  info_color: string;
  dark_error_color: string;
  dark_warning_color: string;
  dark_success_color: string;
  dark_info_color: string;
  // Text colors
  text_primary: string;
  text_secondary: string;
  text_disabled: string;
  dark_text_primary: string;
  dark_text_secondary: string;
  dark_text_disabled: string;
  // Component colors
  sidebar_bg: string;
  sidebar_text: string;
  navbar_bg: string;
  navbar_text: string;
  panel_dark_bg: string;
  panel_dark_fg: string;
  dark_sidebar_bg: string;
  dark_sidebar_text: string;
  dark_navbar_bg: string;
  dark_navbar_text: string;
  dark_panel_dark_bg: string;
  dark_panel_dark_fg: string;
  // Logos
  logo_primary: string;
  logo_white: string;
  logo_small: string;
  logo_name: string;
  favicon: string;
  login_background: string;
  // Typography
  font_family_primary: string;
  font_family_secondary: string;
  font_family_monospace: string;
  font_size_base: string;
  font_size_small: string;
  font_size_large: string;
  font_size_heading: string;
  // Component styles
  button_radius: string;
  card_radius: string;
  input_radius: string;
}

const FONT_FAMILIES = [
  { value: "Manrope", label: "Manrope" },
  { value: "Roboto", label: "Roboto" },
  { value: "Inter", label: "Inter" },
  { value: "Open Sans", label: "Open Sans" },
  { value: "Lato", label: "Lato" },
  { value: "Montserrat", label: "Montserrat" },
  { value: "Poppins", label: "Poppins" },
  { value: "Noto Sans", label: "Noto Sans" },
];

const FONT_SIZES = [
  { value: "12px", label: "12px (Pequeño)" },
  { value: "14px", label: "14px (Base)" },
  { value: "16px", label: "16px (Mediano)" },
  { value: "18px", label: "18px (Grande)" },
];

const RADIUS_OPTIONS = [
  { value: "0px", label: "Sin radio" },
  { value: "0.25rem", label: "Pequeño (0.25rem)" },
  { value: "0.5rem", label: "Mediano (0.5rem)" },
  { value: "0.75rem", label: "Grande (0.75rem)" },
  { value: "1rem", label: "Muy grande (1rem)" },
];

export function meta() {
  return [
    { title: "Tema y Apariencia - AiutoX ERP" },
    {
      name: "description",
      content: "Personaliza los colores, logos y estilos de la aplicación",
    },
  ];
}

export default function ThemeConfigPage() {
  const { t } = useTranslation();
  const { themeLight, themeDark, isLoading, error, updateTheme, isUpdating } =
    useThemeConfig();
  const didNormalizeDefaults = useRef(false);
  const [isNormalizing, setIsNormalizing] = useState(false);

  const defaultValues: ThemeConfigValues = {
    primary_color: "#023E87",
    secondary_color: "#F1F5F9",
    accent_color: "#F1F5F9",
    background_color: "#FFFFFF",
    surface_color: "#FFFFFF",
    dark_primary_color: "#F8FAFC",
    dark_secondary_color: "#1E293B",
    dark_accent_color: "#1E293B",
    dark_background_color: "#020817",
    dark_surface_color: "#0B1220",
    error_color: "#EF4444",
    warning_color: "#F59E0B",
    success_color: "#10B981",
    info_color: "#3B82F6",
    dark_error_color: "#7F1D1D",
    dark_warning_color: "#F59E0B",
    dark_success_color: "#10B981",
    dark_info_color: "#3B82F6",
    text_primary: "#0F172A",
    text_secondary: "#64748B",
    text_disabled: "#94A3B8",
    dark_text_primary: "#F8FAFC",
    dark_text_secondary: "#94A3B8",
    dark_text_disabled: "#64748B",
    sidebar_bg: "#FAFAFA",
    sidebar_text: "#0F172A",
    navbar_bg: "#FFFFFF",
    navbar_text: "#0F172A",
    dark_sidebar_bg: "#0B1220",
    dark_sidebar_text: "#F8FAFC",
    dark_navbar_bg: "#0B1220",
    dark_navbar_text: "#F8FAFC",
    panel_dark_bg: "#1E293B",
    panel_dark_fg: "#F8FAFC",
    dark_panel_dark_bg: "#0F172A",
    dark_panel_dark_fg: "#F8FAFC",
    logo_primary: "/assets/logos/logo.png",
    logo_white: "/assets/logos/logo-white.png",
    logo_small: "/assets/logos/logo-sm.png",
    logo_name: "/assets/logos/logo-name.png",
    favicon: "/favicon.ico",
    login_background: "",
    font_family_primary: "Manrope",
    font_family_secondary: "Arial",
    font_family_monospace: "Courier New",
    font_size_base: "14px",
    font_size_small: "12px",
    font_size_large: "18px",
    font_size_heading: "24px",
    button_radius: "0.25rem",
    card_radius: "0.5rem",
    input_radius: "0.25rem",
  };

  const initialValues: ThemeConfigValues = {
    ...defaultValues,
    ...themeLight,
    ...(themeDark
      ? Object.fromEntries(
          Object.entries(themeDark).map(([key, value]) => [
            `dark_${key}`,
            value,
          ])
        )
      : {}),
  };

  const form = useConfigForm<ThemeConfigValues>({
    initialValues,
  });

  // Actualizar valores cuando se carga la data
  useEffect(() => {
    const isOnline = typeof navigator === "undefined" ? true : navigator.onLine;
    const mergedTheme: Record<string, string> = {
      ...themeLight,
      ...(themeDark
        ? Object.fromEntries(
            Object.entries(themeDark).map(([key, value]) => [
              `dark_${key}`,
              value,
            ])
          )
        : {}),
    };
    const hasTheme = Object.keys(mergedTheme).length > 0;
    const mergedValues = { ...defaultValues, ...mergedTheme };
    const hasMissingKeys = Object.keys(defaultValues).some(
      (key) => !(key in mergedTheme)
    );

    if (!hasTheme && !didNormalizeDefaults.current && isOnline) {
      didNormalizeDefaults.current = true;
      setIsNormalizing(true);
      updateTheme(defaultValues, {
        onSettled: () => setIsNormalizing(false),
      });
      form.updateOriginalValues(defaultValues);
      return;
    }

    if (hasTheme) {
      if (hasMissingKeys && !didNormalizeDefaults.current && isOnline) {
        didNormalizeDefaults.current = true;
        setIsNormalizing(true);
        updateTheme(mergedValues, {
          onSettled: () => setIsNormalizing(false),
        });
      }
      form.updateOriginalValues(mergedValues);
    }
  }, [themeLight, themeDark, updateTheme]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = () => {
    updateTheme(form.values, {
      onSuccess: () => {
        form.updateOriginalValues(form.values);
        showToast(t("config.theme.saveSuccess"), "success");
      },
      onError: () => {
        showToast(t("config.theme.errorSaving"), "error");
      },
    });
  };

  const handleReset = () => {
    form.reset();
  };

  if (isLoading) {
    return (
      <ConfigPageLayout
        title={t("config.theme.title")}
        description={t("config.theme.description")}
        loading={true}
      >
        <ConfigLoadingState lines={8} />
      </ConfigPageLayout>
    );
  }

  if (error) {
    return (
      <ConfigPageLayout
        title={t("config.theme.title")}
        description={t("config.theme.description")}
        error={error instanceof Error ? error : String(error)}
      >
        <ConfigErrorState message={t("config.theme.errorLoading")} />
      </ConfigPageLayout>
    );
  }

  return (
    <ConfigPageLayout
      title={t("config.theme.title")}
      description={t("config.theme.description")}
      hasChanges={form.hasChanges}
      isSaving={isUpdating && !isNormalizing}
      onReset={handleReset}
      onSave={handleSave}
    >
      <Tabs defaultValue="colors" className="space-y-6">
        <TabsList>
          <TabsTrigger value="colors">
            {t("config.theme.tabColors")}
          </TabsTrigger>
          <TabsTrigger value="logos">{t("config.theme.tabLogos")}</TabsTrigger>
          <TabsTrigger value="typography">
            {t("config.theme.tabTypography")}
          </TabsTrigger>
          <TabsTrigger value="components">
            {t("config.theme.tabComponents")}
          </TabsTrigger>
        </TabsList>

        {/* Tab: Colores */}
        <TabsContent value="colors" className="space-y-6">
          <Tabs defaultValue="day" className="space-y-6">
            <TabsList>
              <TabsTrigger value="day">Tema Día</TabsTrigger>
              <TabsTrigger value="night">Tema Nocturno</TabsTrigger>
            </TabsList>

            <TabsContent value="day" className="space-y-6">
              <ConfigSection
                title={t("config.theme.sectionMainColors")}
                description={t("config.theme.sectionMainColorsDesc")}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <ConfigColorInput
                    label={t("config.theme.primaryColor")}
                    id="primary_color"
                    value={form.values.primary_color}
                    onChange={(value) => form.setValue("primary_color", value)}
                    description={t("config.theme.primaryColorDesc")}
                  />
                  <ConfigColorInput
                    label={t("config.theme.secondaryColor")}
                    id="secondary_color"
                    value={form.values.secondary_color}
                    onChange={(value) =>
                      form.setValue("secondary_color", value)
                    }
                    description={t("config.theme.secondaryColorDesc")}
                  />
                  <ConfigColorInput
                    label={t("config.theme.accentColor")}
                    id="accent_color"
                    value={form.values.accent_color}
                    onChange={(value) => form.setValue("accent_color", value)}
                    description={t("config.theme.accentColorDesc")}
                  />
                  <ConfigColorInput
                    label={t("config.theme.backgroundColor")}
                    id="background_color"
                    value={form.values.background_color}
                    onChange={(value) =>
                      form.setValue("background_color", value)
                    }
                    description={t("config.theme.backgroundColorDesc")}
                  />
                  <ConfigColorInput
                    label={t("config.theme.surfaceColor")}
                    id="surface_color"
                    value={form.values.surface_color}
                    onChange={(value) => form.setValue("surface_color", value)}
                    description={t("config.theme.surfaceColorDesc")}
                  />
                </div>
              </ConfigSection>

              <ConfigSection
                title={t("config.theme.sectionStatusColors")}
                description={t("config.theme.sectionStatusColorsDesc")}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <ConfigColorInput
                    label={t("config.theme.errorColor")}
                    id="error_color"
                    value={form.values.error_color}
                    onChange={(value) => form.setValue("error_color", value)}
                  />
                  <ConfigColorInput
                    label={t("config.theme.warningColor")}
                    id="warning_color"
                    value={form.values.warning_color}
                    onChange={(value) => form.setValue("warning_color", value)}
                  />
                  <ConfigColorInput
                    label={t("config.theme.successColor")}
                    id="success_color"
                    value={form.values.success_color}
                    onChange={(value) => form.setValue("success_color", value)}
                  />
                  <ConfigColorInput
                    label={t("config.theme.infoColor")}
                    id="info_color"
                    value={form.values.info_color}
                    onChange={(value) => form.setValue("info_color", value)}
                  />
                </div>
              </ConfigSection>

              <ConfigSection
                title={t("config.theme.sectionTextColors")}
                description={t("config.theme.sectionTextColorsDesc")}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <ConfigColorInput
                    label={t("config.theme.textPrimary")}
                    id="text_primary"
                    value={form.values.text_primary}
                    onChange={(value) => form.setValue("text_primary", value)}
                  />
                  <ConfigColorInput
                    label={t("config.theme.textSecondary")}
                    id="text_secondary"
                    value={form.values.text_secondary}
                    onChange={(value) => form.setValue("text_secondary", value)}
                  />
                  <ConfigColorInput
                    label={t("config.theme.textDisabled")}
                    id="text_disabled"
                    value={form.values.text_disabled}
                    onChange={(value) => form.setValue("text_disabled", value)}
                  />
                </div>
              </ConfigSection>

              <ConfigSection
                title={t("config.theme.sectionComponentColors")}
                description={t("config.theme.sectionComponentColorsDesc")}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <ConfigColorInput
                    label={t("config.theme.sidebarBg")}
                    id="sidebar_bg"
                    value={form.values.sidebar_bg}
                    onChange={(value) => form.setValue("sidebar_bg", value)}
                  />
                  <ConfigColorInput
                    label={t("config.theme.sidebarText")}
                    id="sidebar_text"
                    value={form.values.sidebar_text}
                    onChange={(value) => form.setValue("sidebar_text", value)}
                  />
                  <ConfigColorInput
                    label={t("config.theme.navbarBg")}
                    id="navbar_bg"
                    value={form.values.navbar_bg}
                    onChange={(value) => form.setValue("navbar_bg", value)}
                  />
                  <ConfigColorInput
                    label={t("config.theme.navbarText")}
                    id="navbar_text"
                    value={form.values.navbar_text}
                    onChange={(value) => form.setValue("navbar_text", value)}
                  />
                  <ConfigColorInput
                    label={t("config.theme.panelDarkBg")}
                    id="panel_dark_bg"
                    value={form.values.panel_dark_bg}
                    onChange={(value) => form.setValue("panel_dark_bg", value)}
                    description={t("config.theme.panelDarkBgDesc")}
                  />
                  <ConfigColorInput
                    label={t("config.theme.panelDarkFg")}
                    id="panel_dark_fg"
                    value={form.values.panel_dark_fg}
                    onChange={(value) => form.setValue("panel_dark_fg", value)}
                  />
                </div>
              </ConfigSection>
            </TabsContent>

            <TabsContent value="night" className="space-y-6">
              <ConfigSection
                title={t("config.theme.sectionMainColors")}
                description={t("config.theme.sectionMainColorsDesc")}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <ConfigColorInput
                    label={t("config.theme.primaryColor")}
                    id="dark_primary_color"
                    value={form.values.dark_primary_color}
                    onChange={(value) =>
                      form.setValue("dark_primary_color", value)
                    }
                    description={t("config.theme.primaryColorDesc")}
                  />
                  <ConfigColorInput
                    label={t("config.theme.secondaryColor")}
                    id="dark_secondary_color"
                    value={form.values.dark_secondary_color}
                    onChange={(value) =>
                      form.setValue("dark_secondary_color", value)
                    }
                    description={t("config.theme.secondaryColorDesc")}
                  />
                  <ConfigColorInput
                    label={t("config.theme.accentColor")}
                    id="dark_accent_color"
                    value={form.values.dark_accent_color}
                    onChange={(value) =>
                      form.setValue("dark_accent_color", value)
                    }
                    description={t("config.theme.accentColorDesc")}
                  />
                  <ConfigColorInput
                    label={t("config.theme.backgroundColor")}
                    id="dark_background_color"
                    value={form.values.dark_background_color}
                    onChange={(value) =>
                      form.setValue("dark_background_color", value)
                    }
                    description={t("config.theme.backgroundColorDesc")}
                  />
                  <ConfigColorInput
                    label={t("config.theme.surfaceColor")}
                    id="dark_surface_color"
                    value={form.values.dark_surface_color}
                    onChange={(value) =>
                      form.setValue("dark_surface_color", value)
                    }
                    description={t("config.theme.surfaceColorDesc")}
                  />
                </div>
              </ConfigSection>

              <ConfigSection
                title={t("config.theme.sectionStatusColors")}
                description={t("config.theme.sectionStatusColorsDesc")}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <ConfigColorInput
                    label={t("config.theme.errorColor")}
                    id="dark_error_color"
                    value={form.values.dark_error_color}
                    onChange={(value) =>
                      form.setValue("dark_error_color", value)
                    }
                  />
                  <ConfigColorInput
                    label={t("config.theme.warningColor")}
                    id="dark_warning_color"
                    value={form.values.dark_warning_color}
                    onChange={(value) =>
                      form.setValue("dark_warning_color", value)
                    }
                  />
                  <ConfigColorInput
                    label={t("config.theme.successColor")}
                    id="dark_success_color"
                    value={form.values.dark_success_color}
                    onChange={(value) =>
                      form.setValue("dark_success_color", value)
                    }
                  />
                  <ConfigColorInput
                    label={t("config.theme.infoColor")}
                    id="dark_info_color"
                    value={form.values.dark_info_color}
                    onChange={(value) =>
                      form.setValue("dark_info_color", value)
                    }
                  />
                </div>
              </ConfigSection>

              <ConfigSection
                title={t("config.theme.sectionTextColors")}
                description={t("config.theme.sectionTextColorsDesc")}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <ConfigColorInput
                    label={t("config.theme.textPrimary")}
                    id="dark_text_primary"
                    value={form.values.dark_text_primary}
                    onChange={(value) =>
                      form.setValue("dark_text_primary", value)
                    }
                  />
                  <ConfigColorInput
                    label={t("config.theme.textSecondary")}
                    id="dark_text_secondary"
                    value={form.values.dark_text_secondary}
                    onChange={(value) =>
                      form.setValue("dark_text_secondary", value)
                    }
                  />
                  <ConfigColorInput
                    label={t("config.theme.textDisabled")}
                    id="dark_text_disabled"
                    value={form.values.dark_text_disabled}
                    onChange={(value) =>
                      form.setValue("dark_text_disabled", value)
                    }
                  />
                </div>
              </ConfigSection>

              <ConfigSection
                title={t("config.theme.sectionComponentColors")}
                description={t("config.theme.sectionComponentColorsDesc")}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <ConfigColorInput
                    label={t("config.theme.sidebarBg")}
                    id="dark_sidebar_bg"
                    value={form.values.dark_sidebar_bg}
                    onChange={(value) =>
                      form.setValue("dark_sidebar_bg", value)
                    }
                  />
                  <ConfigColorInput
                    label={t("config.theme.sidebarText")}
                    id="dark_sidebar_text"
                    value={form.values.dark_sidebar_text}
                    onChange={(value) =>
                      form.setValue("dark_sidebar_text", value)
                    }
                  />
                  <ConfigColorInput
                    label={t("config.theme.navbarBg")}
                    id="dark_navbar_bg"
                    value={form.values.dark_navbar_bg}
                    onChange={(value) => form.setValue("dark_navbar_bg", value)}
                  />
                  <ConfigColorInput
                    label={t("config.theme.navbarText")}
                    id="dark_navbar_text"
                    value={form.values.dark_navbar_text}
                    onChange={(value) =>
                      form.setValue("dark_navbar_text", value)
                    }
                  />
                  <ConfigColorInput
                    label={t("config.theme.panelDarkBg")}
                    id="dark_panel_dark_bg"
                    value={form.values.dark_panel_dark_bg}
                    onChange={(value) =>
                      form.setValue("dark_panel_dark_bg", value)
                    }
                    description={t("config.theme.panelDarkBgDesc")}
                  />
                  <ConfigColorInput
                    label={t("config.theme.panelDarkFg")}
                    id="dark_panel_dark_fg"
                    value={form.values.dark_panel_dark_fg}
                    onChange={(value) =>
                      form.setValue("dark_panel_dark_fg", value)
                    }
                  />
                </div>
              </ConfigSection>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Tab: Logos */}
        <TabsContent value="logos" className="space-y-6">
          <ConfigSection
            title={t("config.theme.sectionLogos")}
            description={t("config.theme.sectionLogosDesc")}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ConfigFormField
                label={t("config.theme.logoPrimary")}
                id="logo_primary"
                value={form.values.logo_primary}
                onChange={(value) => form.setValue("logo_primary", value)}
                placeholder="/assets/logos/logo.png"
                description={t("config.theme.logoPrimaryDesc")}
              />
              <ConfigFormField
                label={t("config.theme.logoWhite")}
                id="logo_white"
                value={form.values.logo_white}
                onChange={(value) => form.setValue("logo_white", value)}
                placeholder="/assets/logos/logo-white.png"
                description={t("config.theme.logoWhiteDesc")}
              />
              <ConfigFormField
                label={t("config.theme.logoSmall")}
                id="logo_small"
                value={form.values.logo_small}
                onChange={(value) => form.setValue("logo_small", value)}
                placeholder="/assets/logos/logo-sm.png"
                description={t("config.theme.logoSmallDesc")}
              />
              <ConfigFormField
                label={t("config.theme.logoName")}
                id="logo_name"
                value={form.values.logo_name}
                onChange={(value) => form.setValue("logo_name", value)}
                placeholder="/assets/logos/logo-name.png"
                description={t("config.theme.logoNameDesc")}
              />
              <ConfigFormField
                label={t("config.theme.favicon")}
                id="favicon"
                value={form.values.favicon}
                onChange={(value) => form.setValue("favicon", value)}
                placeholder="/favicon.ico"
                description={t("config.theme.faviconDesc")}
              />
              <ConfigFormField
                label={t("config.theme.loginBackground")}
                id="login_background"
                value={form.values.login_background}
                onChange={(value) => form.setValue("login_background", value)}
                placeholder="/assets/login-background.jpg"
                description={t("config.theme.loginBackgroundDesc")}
              />
            </div>
          </ConfigSection>
        </TabsContent>

        {/* Tab: Tipografía */}
        <TabsContent value="typography" className="space-y-6">
          <ConfigSection
            title={t("config.theme.sectionFonts")}
            description={t("config.theme.sectionFontsDesc")}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ConfigFormField
                label={t("config.theme.fontFamilyPrimary")}
                id="font_family_primary"
                value={form.values.font_family_primary}
                onChange={(value) =>
                  form.setValue("font_family_primary", value)
                }
                description={t("config.theme.fontFamilyPrimaryDesc")}
                input={
                  <Select
                    value={form.values.font_family_primary}
                    onValueChange={(value) =>
                      form.setValue("font_family_primary", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FONT_FAMILIES.map((font) => (
                        <SelectItem key={font.value} value={font.value}>
                          {font.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                }
              />
              <ConfigFormField
                label={t("config.theme.fontFamilySecondary")}
                id="font_family_secondary"
                value={form.values.font_family_secondary}
                onChange={(value) =>
                  form.setValue("font_family_secondary", value)
                }
                description={t("config.theme.fontFamilySecondaryDesc")}
                input={
                  <Select
                    value={form.values.font_family_secondary}
                    onValueChange={(value) =>
                      form.setValue("font_family_secondary", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FONT_FAMILIES.map((font) => (
                        <SelectItem key={font.value} value={font.value}>
                          {font.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                }
              />
              <ConfigFormField
                label={t("config.theme.fontFamilyMonospace")}
                id="font_family_monospace"
                value={form.values.font_family_monospace}
                onChange={(value) =>
                  form.setValue("font_family_monospace", value)
                }
                description={t("config.theme.fontFamilyMonospaceDesc")}
                input={
                  <Select
                    value={form.values.font_family_monospace}
                    onValueChange={(value) =>
                      form.setValue("font_family_monospace", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Courier New">Courier New</SelectItem>
                      <SelectItem value="Monaco">Monaco</SelectItem>
                      <SelectItem value="Consolas">Consolas</SelectItem>
                      <SelectItem value="Menlo">Menlo</SelectItem>
                    </SelectContent>
                  </Select>
                }
              />
            </div>
          </ConfigSection>

          <ConfigSection
            title={t("config.theme.sectionFontSizes")}
            description={t("config.theme.sectionFontSizesDesc")}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ConfigFormField
                label={t("config.theme.fontSizeBase")}
                id="font_size_base"
                value={form.values.font_size_base}
                onChange={(value) => form.setValue("font_size_base", value)}
                description={t("config.theme.fontSizeBaseDesc")}
                input={
                  <Select
                    value={form.values.font_size_base}
                    onValueChange={(value) =>
                      form.setValue("font_size_base", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FONT_SIZES.map((size) => (
                        <SelectItem key={size.value} value={size.value}>
                          {size.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                }
              />
              <ConfigFormField
                label={t("config.theme.fontSizeSmall")}
                id="font_size_small"
                value={form.values.font_size_small}
                onChange={(value) => form.setValue("font_size_small", value)}
                description={t("config.theme.fontSizeSmallDesc")}
                input={
                  <Select
                    value={form.values.font_size_small}
                    onValueChange={(value) =>
                      form.setValue("font_size_small", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FONT_SIZES.map((size) => (
                        <SelectItem key={size.value} value={size.value}>
                          {size.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                }
              />
              <ConfigFormField
                label={t("config.theme.fontSizeLarge")}
                id="font_size_large"
                value={form.values.font_size_large}
                onChange={(value) => form.setValue("font_size_large", value)}
                description={t("config.theme.fontSizeLargeDesc")}
                input={
                  <Select
                    value={form.values.font_size_large}
                    onValueChange={(value) =>
                      form.setValue("font_size_large", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FONT_SIZES.map((size) => (
                        <SelectItem key={size.value} value={size.value}>
                          {size.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                }
              />
              <ConfigFormField
                label={t("config.theme.fontSizeHeading")}
                id="font_size_heading"
                value={form.values.font_size_heading}
                onChange={(value) => form.setValue("font_size_heading", value)}
                description={t("config.theme.fontSizeHeadingDesc")}
                input={
                  <Select
                    value={form.values.font_size_heading}
                    onValueChange={(value) =>
                      form.setValue("font_size_heading", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="20px">20px</SelectItem>
                      <SelectItem value="24px">24px</SelectItem>
                      <SelectItem value="28px">28px</SelectItem>
                      <SelectItem value="32px">32px</SelectItem>
                      <SelectItem value="36px">36px</SelectItem>
                    </SelectContent>
                  </Select>
                }
              />
            </div>
          </ConfigSection>
        </TabsContent>

        {/* Tab: Componentes */}
        <TabsContent value="components" className="space-y-6">
          <ConfigSection
            title={t("config.theme.sectionRadius")}
            description={t("config.theme.sectionRadiusDesc")}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ConfigFormField
                label={t("config.theme.buttonRadius")}
                id="button_radius"
                value={form.values.button_radius}
                onChange={(value) => form.setValue("button_radius", value)}
                description={t("config.theme.buttonRadiusDesc")}
                input={
                  <Select
                    value={form.values.button_radius}
                    onValueChange={(value) =>
                      form.setValue("button_radius", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RADIUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                }
              />
              <ConfigFormField
                label={t("config.theme.cardRadius")}
                id="card_radius"
                value={form.values.card_radius}
                onChange={(value) => form.setValue("card_radius", value)}
                description={t("config.theme.cardRadiusDesc")}
                input={
                  <Select
                    value={form.values.card_radius}
                    onValueChange={(value) =>
                      form.setValue("card_radius", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RADIUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                }
              />
              <ConfigFormField
                label={t("config.theme.inputRadius")}
                id="input_radius"
                value={form.values.input_radius}
                onChange={(value) => form.setValue("input_radius", value)}
                description={t("config.theme.inputRadiusDesc")}
                input={
                  <Select
                    value={form.values.input_radius}
                    onValueChange={(value) =>
                      form.setValue("input_radius", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RADIUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                }
              />
            </div>
          </ConfigSection>

          {/* Preview del tema */}
          <ConfigSection
            title={t("config.theme.sectionPreview")}
            description={t("config.theme.sectionPreviewDesc")}
          >
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-4">
                  <div
                    className="h-12 w-12 rounded-md flex items-center justify-center text-white font-semibold"
                    style={{ backgroundColor: form.values.primary_color }}
                  >
                    P
                  </div>
                  <div className="flex-1">
                    <h4
                      className="font-semibold"
                      style={{ color: form.values.text_primary }}
                    >
                      {t("config.theme.previewTitle")}
                    </h4>
                    <p
                      className="text-sm"
                      style={{ color: form.values.text_secondary }}
                    >
                      {t("config.theme.previewDescription")}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    className="px-4 py-2 rounded-md text-white font-medium"
                    style={{
                      backgroundColor: form.values.primary_color,
                      borderRadius: form.values.button_radius,
                    }}
                  >
                    {t("config.theme.buttonPrimary")}
                  </button>
                  <button
                    className="px-4 py-2 rounded-md border font-medium"
                    style={{
                      borderColor: form.values.primary_color,
                      color: form.values.primary_color,
                      borderRadius: form.values.button_radius,
                    }}
                  >
                    {t("config.theme.buttonSecondary")}
                  </button>
                </div>
              </CardContent>
            </Card>
          </ConfigSection>
        </TabsContent>
      </Tabs>
    </ConfigPageLayout>
  );
}
