export const translations = {
  admin: {
    modules: {
      title: "Module Management",
      description: "Manage the modules enabled for your organization",
      buttons: {
        refresh: "Refresh",
      },
      table: {
        module: "Module",
        state: "State",
        version: "Version",
        tier: "Tier",
        installedAt: "Installed at",
        gracePeriod: "Grace period",
        actions: "Actions",
      },
      messages: {
        loading: "Loading modules...",
        empty: "No modules installed",
        error: "Could not load modules. Please try again.",
      },
      confirmDialogs: {
        hardUninstall: {
          title: "Permanently delete module",
          description:
            "This will permanently delete all module data. This action cannot be undone.",
          confirm: "Permanently delete",
          cancel: "Cancel",
        },
      },
    },
  },
  setup: {
    loading: "Loading setup status...",
    error: {
      title: "Setup Error",
      message: "Could not load setup status. Please try again later.",
    },
    windowClosed: {
      title: "Setup Window Closed",
      message:
        "The initial setup window has expired. Contact your system administrator.",
    },
    welcome: {
      title: "Welcome to AiutoX ERP",
      subtitle: "Let's set up your administrator account to get started",
    },
    status: {
      required: {
        title: "Setup Required",
        message: "No administrator account exists yet. Create one below.",
      },
    },
    info: {
      security: {
        title: "Security",
        message:
          "Your password must be at least 8 characters and include uppercase, lowercase, and a digit.",
      },
      window: {
        title: "Setup Window",
        message: "This setup form is available for {{minutes}} minutes.",
      },
    },
    form: {
      title: "Create Administrator Account",
      description: "This account will have full administrative access",
      success: {
        title: "Account Created",
        message: "Administrator account created successfully. Redirecting to login...",
      },
      error: {
        title: "Setup Failed",
        message: "Could not create the administrator account. Please try again.",
      },
      email: {
        label: "Email",
        placeholder: "admin@example.com",
        description: "This will be your login email",
        invalid: "Please enter a valid email address",
      },
      fullName: {
        label: "Full Name",
        placeholder: "John Doe",
        description: "Your full name as it will appear in the system",
        required: "Full name is required",
      },
      password: {
        label: "Password",
        placeholder: "Enter a strong password",
        description: "At least 8 characters, with uppercase, lowercase, and a digit",
        minLength: "Password must be at least 8 characters",
        uppercase: "Password must include an uppercase letter",
        lowercase: "Password must include a lowercase letter",
        digit: "Password must include a digit",
      },
      confirmPassword: {
        label: "Confirm Password",
        placeholder: "Re-enter your password",
        mismatch: "Passwords do not match",
      },
      submit: "Create Account",
    },
  },
};
