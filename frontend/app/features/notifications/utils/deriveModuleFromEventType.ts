/**
 * Derives a display-friendly business module label from a NotificationTemplate's
 * event_type prefix (e.g. "billing.cobro_generado" -> "Billing"). event_type has
 * no dedicated module column — the prefix convention is the only signal
 * available, so this is a UI convenience over existing data, not a new
 * backend contract.
 */
export function deriveModuleFromEventType(eventType: string): string {
  const dotIndex = eventType.indexOf(".");
  if (dotIndex <= 0) return "General";
  const prefix = eventType.slice(0, dotIndex);
  return prefix.charAt(0).toUpperCase() + prefix.slice(1);
}
