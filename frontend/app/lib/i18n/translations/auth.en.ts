/**
 * English translations for Auth module - Password Management
 */

export const authTranslations = {
  auth: {
    password: {
      current: {
        label: "Current password",
        placeholder: "Enter your current password",
      },
      new: {
        label: "New password",
        placeholder: "Enter your new password",
      },
      confirm: {
        label: "Confirm password",
        placeholder: "Confirm your new password",
      },
      strength: {
        label: "Password strength",
        "very-weak": "Very weak",
        weak: "Weak",
        fair: "Fair",
        good: "Good",
        strong: "Strong",
        crackTime: "Estimated crack time",
      },
      requirements: {
        title: "Password requirements:",
        minStrength: "Minimum strength: Fair (2/4)",
        minLength: "Minimum 12 characters",
        mixedCase: "Uppercase and lowercase",
        numbers: "Include numbers",
        special: "Include special characters",
      },
      change: {
        title: "Change Password",
        submit: "Change Password",
        submitting: "Changing...",
        info: "When you change your password, all your active sessions will be closed and you will need to log in again.",
        success: {
          title: "Password changed",
          description:
            "Your password has been changed successfully. {count} sessions were closed.",
        },
      },
      error: {
        title: "Error changing password",
        generic:
          "An error occurred while changing the password. Please try again.",
        passwordsDoNotMatch: "Passwords do not match",
        samePassword: "New password must be different from current password",
        weakPassword: "Password does not meet minimum strength requirements",
        INVALID_CURRENT_PASSWORD: "Current password is incorrect",
        WEAK_PASSWORD: "Password is too weak",
        PASSWORD_REUSED: "You cannot reuse one of your last 5 passwords",
        SAME_PASSWORD: "New password must be different from current password",
        RATE_LIMIT_EXCEEDED: "Too many attempts. Please try again later",
      },
      history: {
        title: "Change History",
        empty: "No password changes recorded",
        changedAt: "Changed on",
        changedBy: "Changed by",
        user: "User",
        admin: "Administrator",
        system: "System",
        reason: "Reason",
        ipAddress: "IP Address",
      },
      forceChange: {
        title: "Password Change Required",
        description: "You must change your password before continuing",
        reasonLabel: "Reason",
        cannotClose:
          "You cannot close this window until you change your password",
        footer:
          "For your security, this change is mandatory. All your active sessions will be closed after the change.",
        reason: {
          generic: "Password change required",
          adminForced: "Change requested by administrator",
          securityBreach: "Change required for security reasons",
          policyExpired:
            "Your password has expired according to security policy",
          firstLogin: "You must change the temporary password on first login",
          compromised: "Your password may have been compromised",
        },
      },
      generator: {
        title: "Password Generator",
        generate: "Generate",
        copy: "Copy",
        copied: "Copied",
        options: {
          length: "Length",
          useUppercase: "Uppercase",
          useLowercase: "Lowercase",
          useDigits: "Numbers",
          useSpecial: "Special characters",
          excludeAmbiguous: "Exclude ambiguous characters (il1Lo0O)",
        },
      },
      policies: {
        title: "Password Policies",
        scope: {
          global: "Global",
          role: "By Role",
          user: "By User",
        },
        settings: {
          historyCount: "Passwords to remember",
          changeRateLimit: "Attempts per hour",
          minStrengthScore: "Minimum strength",
          passwordExpiryDays: "Days until expiration",
          gracePeriodDays: "Grace period days",
        },
        warnings: {
          title: "Expiration Notifications",
          daysBeforeExpiry: "Days before expiry",
          channels: "Notification channels",
        },
      },
    },
  },
};
