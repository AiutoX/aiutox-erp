/**
 * Spanish translations for Auth module - Password Management
 */

export const authTranslations = {
  auth: {
    password: {
      current: {
        label: "Contraseña actual",
        placeholder: "Ingresa tu contraseña actual",
      },
      new: {
        label: "Nueva contraseña",
        placeholder: "Ingresa tu nueva contraseña",
      },
      confirm: {
        label: "Confirmar contraseña",
        placeholder: "Confirma tu nueva contraseña",
      },
      strength: {
        label: "Fortaleza de la contraseña",
        "very-weak": "Muy débil",
        weak: "Débil",
        fair: "Aceptable",
        good: "Buena",
        strong: "Fuerte",
        crackTime: "Tiempo estimado para crackear",
      },
      requirements: {
        title: "Requisitos de contraseña:",
        minStrength: "Fortaleza mínima: Aceptable (2/4)",
        minLength: "Mínimo 12 caracteres",
        mixedCase: "Mayúsculas y minúsculas",
        numbers: "Incluir números",
        special: "Incluir caracteres especiales",
      },
      change: {
        title: "Cambiar Contraseña",
        submit: "Cambiar Contraseña",
        submitting: "Cambiando...",
        info: "Al cambiar tu contraseña, todas tus sesiones activas serán cerradas y deberás iniciar sesión nuevamente.",
        success: {
          title: "Contraseña cambiada",
          description:
            "Tu contraseña ha sido cambiada exitosamente. {count} sesiones fueron cerradas.",
        },
      },
      error: {
        title: "Error al cambiar contraseña",
        generic:
          "Ocurrió un error al cambiar la contraseña. Intenta nuevamente.",
        passwordsDoNotMatch: "Las contraseñas no coinciden",
        samePassword: "La nueva contraseña debe ser diferente a la actual",
        weakPassword:
          "La contraseña no cumple con los requisitos mínimos de fortaleza",
        INVALID_CURRENT_PASSWORD: "La contraseña actual es incorrecta",
        WEAK_PASSWORD: "La contraseña es demasiado débil",
        PASSWORD_REUSED:
          "No puedes reutilizar una de tus últimas 5 contraseñas",
        SAME_PASSWORD: "La nueva contraseña debe ser diferente a la actual",
        RATE_LIMIT_EXCEEDED:
          "Demasiados intentos. Intenta nuevamente más tarde",
      },
      history: {
        title: "Historial de Cambios",
        empty: "No hay cambios de contraseña registrados",
        changedAt: "Cambiada el",
        changedBy: "Cambiada por",
        user: "Usuario",
        admin: "Administrador",
        system: "Sistema",
        reason: "Razón",
        ipAddress: "Dirección IP",
      },
      forceChange: {
        title: "Cambio de Contraseña Requerido",
        description: "Debes cambiar tu contraseña antes de continuar",
        reasonLabel: "Razón",
        cannotClose:
          "No puedes cerrar esta ventana hasta que cambies tu contraseña",
        footer:
          "Por tu seguridad, este cambio es obligatorio. Todas tus sesiones activas serán cerradas después del cambio.",
        reason: {
          generic: "Se requiere cambio de contraseña",
          adminForced: "Cambio solicitado por el administrador",
          securityBreach: "Cambio requerido por razones de seguridad",
          policyExpired:
            "Tu contraseña ha expirado según la política de seguridad",
          firstLogin:
            "Debes cambiar la contraseña temporal en tu primer inicio de sesión",
          compromised: "Tu contraseña puede haber sido comprometida",
        },
      },
      generator: {
        title: "Generador de Contraseñas",
        generate: "Generar",
        copy: "Copiar",
        copied: "Copiado",
        options: {
          length: "Longitud",
          useUppercase: "Mayúsculas",
          useLowercase: "Minúsculas",
          useDigits: "Números",
          useSpecial: "Caracteres especiales",
          excludeAmbiguous: "Excluir caracteres ambiguos (il1Lo0O)",
        },
      },
      policies: {
        title: "Políticas de Contraseña",
        scope: {
          global: "Global",
          role: "Por Rol",
          user: "Por Usuario",
        },
        settings: {
          historyCount: "Contraseñas a recordar",
          changeRateLimit: "Intentos por hora",
          minStrengthScore: "Fortaleza mínima",
          passwordExpiryDays: "Días hasta expiración",
          gracePeriodDays: "Días de gracia",
        },
        warnings: {
          title: "Notificaciones de Expiración",
          daysBeforeExpiry: "Días antes de expirar",
          channels: "Canales de notificación",
        },
      },
    },
  },
};
