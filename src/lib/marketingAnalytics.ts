/**
 * Small GA4 event helper for acquisition-funnel diagnostics.
 *
 * This uses the existing gtag installation in index.html.
 * Never include emails, user IDs or other personal information in event params.
 */
export function trackMarketingEvent(
  eventName: string,
  params: Record<string, unknown> = {},
): void {
  if (typeof window === 'undefined') return;
  const gtag = (window as Window & { gtag?: (...args: unknown[]) => void }).gtag;
  if (typeof gtag === 'function') {
    gtag('event', eventName, params);
  }
}
