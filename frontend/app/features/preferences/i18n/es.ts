/**
 * Spanish translations — Preferences module
 */

export const translations = {
  preferences: {
    title: "Preferencias de Notificaciones",
    description: "Controla qué notificaciones recibes y por qué canal.",
    save: "Guardar cambios",
    saving: "Guardando...",
    saved: "Preferencias guardadas",
    saveError: "Error al guardar preferencias",

    channels: {
      title: "Canales",
      email: "Email",
      whatsapp: "WhatsApp",
      "in-app": "En la app",
      sms: "SMS",
    },

    channelStatus: {
      connected: "Conectado",
      disconnected: "No configurado",
      whatsappConnected: "WhatsApp conectado",
      whatsappDisconnected: "WhatsApp no configurado",
      emailConnected: "Email configurado",
      emailDisconnected: "Email no configurado",
    },

    eventTypes: {
      "billing.cobro_generado": "Cobro generado",
      "billing.pago_recibido": "Pago recibido",
      "billing.aviso_mora": "Aviso de mora",
      "billing.intereses_mora": "Intereses de mora",
      "lease.contrato_vence": "Contrato por vencer",
      "lease.notif_reajuste": "Reajuste de canon",
      "maintenance.ot_asignada": "Orden de trabajo asignada",
      "maintenance.presupuesto_aprobado": "Presupuesto aprobado",
    },

    groups: {
      billing: "Facturación",
      lease: "Contratos",
      maintenance: "Mantenimiento",
    },

    enabled: "Habilitado",
    disabled: "Deshabilitado",
    noChannels: "Sin canales seleccionados",
  },
};
