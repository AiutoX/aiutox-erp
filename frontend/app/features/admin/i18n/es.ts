export const translations = {
  admin: {
    modules: {
      title: "Gestión de Módulos",
      description: "Administra los módulos habilitados para tu organización",
      buttons: {
        refresh: "Actualizar",
      },
      table: {
        module: "Módulo",
        state: "Estado",
        version: "Versión",
        tier: "Plan",
        installedAt: "Instalado el",
        gracePeriod: "Período de gracia",
        actions: "Acciones",
      },
      messages: {
        loading: "Cargando módulos...",
        empty: "No hay módulos instalados",
        error: "No se pudieron cargar los módulos. Intenta de nuevo.",
      },
      confirmDialogs: {
        hardUninstall: {
          title: "Eliminar módulo permanentemente",
          description:
            "Esta acción eliminará todos los datos del módulo de forma irreversible. Esta operación no se puede deshacer.",
          confirm: "Eliminar permanentemente",
          cancel: "Cancelar",
        },
      },
    },
  },
  setup: {
    loading: "Cargando estado de configuración...",
    error: {
      title: "Error de Configuración",
      message: "No se pudo cargar el estado de configuración. Intenta más tarde.",
    },
    windowClosed: {
      title: "Ventana de Configuración Cerrada",
      message:
        "La ventana inicial de configuración ha expirado. Contacta a tu administrador del sistema.",
    },
    welcome: {
      title: "Bienvenido a AiutoX ERP",
      subtitle: "Configuremos tu cuenta de administrador para comenzar",
    },
    status: {
      required: {
        title: "Configuración Requerida",
        message: "Aún no existe una cuenta de administrador. Crea una a continuación.",
      },
    },
    info: {
      security: {
        title: "Seguridad",
        message:
          "Tu contraseña debe tener al menos 8 caracteres e incluir mayúscula, minúscula y un dígito.",
      },
      window: {
        title: "Ventana de Configuración",
        message: "Este formulario de configuración está disponible por {{minutes}} minutos.",
      },
    },
    form: {
      title: "Crear Cuenta de Administrador",
      description: "Esta cuenta tendrá acceso administrativo completo",
      success: {
        title: "Cuenta Creada",
        message: "Cuenta de administrador creada correctamente. Redirigiendo al login...",
      },
      error: {
        title: "Error en la Configuración",
        message: "No se pudo crear la cuenta de administrador. Intenta de nuevo.",
      },
      email: {
        label: "Correo Electrónico",
        placeholder: "admin@example.com",
        description: "Este será tu correo de inicio de sesión",
        invalid: "Ingresa un correo electrónico válido",
      },
      fullName: {
        label: "Nombre Completo",
        placeholder: "Juan Pérez",
        description: "Tu nombre completo tal como aparecerá en el sistema",
        required: "El nombre completo es obligatorio",
      },
      password: {
        label: "Contraseña",
        placeholder: "Ingresa una contraseña segura",
        description: "Al menos 8 caracteres, con mayúscula, minúscula y un dígito",
        minLength: "La contraseña debe tener al menos 8 caracteres",
        uppercase: "La contraseña debe incluir una mayúscula",
        lowercase: "La contraseña debe incluir una minúscula",
        digit: "La contraseña debe incluir un dígito",
      },
      confirmPassword: {
        label: "Confirmar Contraseña",
        placeholder: "Ingresa tu contraseña de nuevo",
        mismatch: "Las contraseñas no coinciden",
      },
      submit: "Crear Cuenta",
    },
  },
};
