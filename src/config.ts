// Stripe payment link — hardcoded URL from the Stripe dashboard (MVP: no SDK/checkout endpoint).
// Set VITE_STRIPE_PAYMENT_URL at build time. Falls back to a mailto so the CTA is never dead.
export const STRIPE_PAYMENT_URL =
  import.meta.env.VITE_STRIPE_PAYMENT_URL ||
  "mailto:admin.procureportal@gmail.com?subject=ProcurePortal%20subscription";
