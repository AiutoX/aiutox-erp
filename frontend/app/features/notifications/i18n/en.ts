export const translations = {
  notifications: {
    title: "Notification Center",
    description: "Manage and monitor all your notifications in real-time",

    // Status & Connection
    status: {
      connected: "Connected (Live)",
      disconnected: "Disconnected",
      pending: "Pending",
      sent: "Sent",
      failed: "Failed",
    },

    // Actions
    action: {
      reconnect: "Reconnect",
      retry: "Retry",
      delete: "Delete",
      markAsRead: "Mark as Read",
      markAllAsRead: "Mark All as Read",
      clear: "Clear",
      settings: "Settings",
    },

    // Channels
    channel: {
      email: "Email",
      sms: "SMS",
      inApp: "In-App",
      webhook: "Webhook",
      push: "Push",
    },

    // Tabs
    tabs: {
      queue: "Notification Queue",
      preferences: "Preferences",
      templates: "Templates",
      history: "History",
    },

    // Queue
    queue: {
      loadError: "Error loading notifications queue",
      totalDesc: "Total notifications",
      pendingDesc: "Pending notifications",
      sentDesc: "Sent notifications",
      failedDesc: "Failed notifications",
      noTemplate: "No template",
      notSentYet: "Not sent yet",
      dataPreview: "Notification Data",
      errorMessage: "Error Message",
      view: "View",
      resend: "Resend",
    },

    // Statistics
    stats: {
      total: "Total",
      pending: "Pending",
      sent: "Sent",
      failed: "Failed",
      today: "Today",
      thisWeek: "This Week",
      thisMonth: "This Month",
    },

    // Filters
    filter: {
      search: "Search by event or recipient...",
      allChannels: "All Channels",
      allStatus: "All Status",
      byDate: "By Date",
      byChannel: "By Channel",
      byStatus: "By Status",
    },

    // Fields
    field: {
      id: "ID",
      event: "Event",
      recipient: "Recipient",
      channel: "Channel",
      status: "Status",
      created: "Created",
      sent: "Sent",
      error: "Error",
      subject: "Subject",
      body: "Body",
      data: "Data",
      template: "Template",
    },

    // States
    state: {
      loading: "Loading notifications...",
      empty: "No notifications to display",
      error: "Error loading notifications",
      retrying: "Retrying...",
      noResults: "No results for this filter",
    },

    // Preferences
    preferences: {
      title: "Notification Preferences",
      description: "Configure how and when you want to receive notifications",
      coming: "Custom preferences will be available soon",

      // Channel settings
      emailNotifications: "Email Notifications",
      smsNotifications: "SMS Notifications",
      inAppNotifications: "In-App Notifications",
      pushNotifications: "Push Notifications",

      // Frequency
      frequency: "Frequency",
      immediately: "Immediately",
      daily: "Daily",
      weekly: "Weekly",
      never: "Never",

      // Email settings
      emailAddress: "Email Address",
      emailDigest: "Email Digest",

      // Quiet hours
      quietHours: "Quiet Hours",
      quietHoursStart: "Start Time",
      quietHoursEnd: "End Time",
      quietHoursDescription: "Don't receive notifications during these hours",
    },

    // Messages
    message: {
      connectionLost: "Connection lost. Reconnecting...",
      reconnectSuccess: "Reconnected successfully",
      reconnectFailed: "Failed to reconnect. Try again later.",
      deleteSuccess: "Notification deleted",
      deleteFailed: "Error deleting notification",
      markAsReadSuccess: "Notification marked as read",
      markAsReadFailed: "Error marking as read",
    },

    // Templates
    templates: {
      count: "templates",
      create: "New Template",
      edit: "Edit Template",
      createDescription: "Create a new notification template",
      editDescription: "Modify the existing template",
      empty: "No templates configured",
      active: "Active",
      inactive: "Inactive",
      name: "Name",
      namePlaceholder: "e.g. Charge Notice",
      eventType: "Event Type",
      channel: "Channel",
      subject: "Subject",
      subjectPlaceholder: "Message subject...",
      body: "Body",
      bodyPlaceholder: "Message body. Use {{variable}} for variables.",
      deleteTitle: "Delete Template",
      deleteConfirm: "Delete template",
      created: "Template created",
      updated: "Template updated",
      deleted: "Template deleted",
      error: "Error saving template",
      validationError: "Complete name, event type and body",
    },

    // Common
    common: {
      back: "Back",
      cancel: "Cancel",
      save: "Save",
      delete: "Delete",
      close: "Close",
      loading: "Loading...",
      saving: "Saving...",
      deleting: "Deleting...",
      refresh: "Refresh",
      noData: "No data",
      error: "Error",
    },
  },
};
