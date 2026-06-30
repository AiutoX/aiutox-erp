const fieldEn = {
  field: {
    app: {
      name: "AiutoX Field",
    },
    auth: {
      pinLogin: {
        title: "Enter your PIN",
        subtitle: "Field App Access",
        enter: "Enter",
        clear: "Clear",
        usePassword: "Use ERP password",
        lockout: "Locked for {{seconds}}s",
        attemptsRemaining: "{{count}} attempt remaining",
        attemptsRemaining_plural: "{{count}} attempts remaining",
        error: "Incorrect PIN",
      },
      pinSetup: {
        title: "Set your field PIN",
        subtitle: "Enter a 4 to 6 digit PIN for quick access",
        confirm: "Confirm your PIN",
        save: "Save PIN",
        mismatch: "PINs do not match. Try again.",
        success: "PIN set successfully",
      },
    },
    queue: {
      title: "Available forms",
      empty: "No forms available",
      emptyHelp: "Connect to the internet to download field forms.",
      summary: "{{downloaded}} of {{total}} downloaded",
      refresh: "Refresh",
      availableSection: "Available",
      downloadedSection: "Downloaded",
      download: "Download",
      open: "Open",
      removeDownload: "Remove download",
      downloading: "Downloading...",
      downloaded: "Downloaded",
      updating: "Updating",
      available: "Available",
      expires: "Due: {{date}}",
    },
    sync: {
      pending: "{{count}} pending",
      pending_plural: "{{count}} pending",
      synced: "Synced",
      error: "Sync error",
      syncing: "Syncing...",
      modalTitle: "Sync Status",
      noItems: "All caught up",
      forceSync: "Sync now",
      close: "Close",
      lastSyncAt: "Last synced: {{time}}",
      never: "Never",
      failedCount: "{{count}} failed",
    },
    settings: {
      title: "Settings",
      oneQuestionMode: "One question at a time",
      highContrast: "High contrast (sunlight) mode",
      changePIN: "Change PIN",
      logout: "Log out",
      version: "Version",
    },
    renderer: {
      notFound: "Form not found",
      notFoundHelp:
        "This form is not downloaded. Go back to the list to download it.",
      backToList: "Back to forms",
      back: "Back",
      submit: "Submit responses",
      allQuestions: "Show all",
      oneByOne: "One by one",
      submitError:
        "Submit failed. Your responses are saved and will sync automatically when online.",
      successTitle: "Responses submitted",
      successBody:
        "Your responses have been saved and will sync automatically when connected.",
      prev: "Previous",
      next: "Next",
      finish: "Submit",
      progress: "{{current}} of {{total}}",
    },
    form: {
      placeholderTitle: "Field form",
      placeholderBody: "This route is reserved for the Phase F3 form renderer.",
    },
    scanner: {
      modalTitle: "Scan QR / Barcode",
      videoLabel: "Camera preview",
      openButton: "Scan barcode",
      cancel: "Cancel",
      hint: "Point the camera at a QR code or barcode",
      starting: "Starting camera…",
      permissionDenied:
        "Camera permission denied. Please allow camera access in your browser settings.",
      errorGeneric: "Could not start the camera. Try again.",
    },
    gps: {
      accuracy: "±{{meters}} m accuracy",
      capturing: "Acquiring location…",
      recapture: "Re-capture location",
      manual: "Enter manually",
      skipToManual: "Skip — enter coordinates manually",
      useMyLocation: "Use my location",
      latitude: "Latitude",
      longitude: "Longitude",
      errorPermission:
        "Location permission denied. Enter coordinates manually.",
      errorTimeout:
        "Location timed out (10 s). Check your GPS signal or enter manually.",
      errorUnavailable: "Location unavailable. Enter coordinates manually.",
      errorNotSupported:
        "GPS is not supported on this device. Enter coordinates manually.",
    },
    nav: {
      forms: "Forms",
      settings: "Settings",
    },
  },
} as const;

export default fieldEn;
