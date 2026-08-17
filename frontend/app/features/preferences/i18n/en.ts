/**
 * English translations — Preferences module
 */

export const translations = {
  preferences: {
    title: "Notification Preferences",
    description:
      "Control which notifications you receive and through which channel.",
    save: "Save changes",
    saving: "Saving...",
    saved: "Preferences saved",
    saveError: "Error saving preferences",

    channels: {
      title: "Channels",
      email: "Email",
      whatsapp: "WhatsApp",
      "in-app": "In-app",
      sms: "SMS",
      telegram: "Telegram",
    },

    channelStatus: {
      connected: "Connected",
      disconnected: "Not configured",
      whatsappConnected: "WhatsApp connected",
      whatsappDisconnected: "WhatsApp not configured",
      emailConnected: "Email configured",
      emailDisconnected: "Email not configured",
      telegramConnected: "Telegram linked",
      telegramDisconnected: "Telegram not linked",
      "in-appConnected": "Available",
      "in-appDisconnected": "Not available",
    },

    eventTypes: {
      "billing.cobro_generado": "Charge generated",
      "billing.pago_recibido": "Payment received",
      "billing.aviso_mora": "Overdue notice",
      "billing.intereses_mora": "Late interest applied",
      "lease.contrato_vence": "Expiring contract",
      "lease.notif_reajuste": "Rent adjustment",
      "maintenance.ot_asignada": "Work order assigned",
      "maintenance.presupuesto_aprobado": "Budget approved",
    },

    groups: {
      billing: "Billing",
      lease: "Leases",
      maintenance: "Maintenance",
      comments: "Comments",
    },

    enabled: "Enabled",
    disabled: "Disabled",
    noChannels: "No channels selected",
  },
};
