// Quick event entry (the "Hitri vpis" button and its PIN screen) depends on
// intranet.api.verify_pin, which is not deployed on the live Frappe site yet.
// Keeping it dev-only means production builds ship without the toolbar button,
// the PIN modal and the /admin/uporabniki PIN page, while local development
// keeps the whole flow working against the mock or a configured backend.
export const quickEntryEnabled = import.meta.env.DEV
