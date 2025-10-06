/**
 * Guest Pass Configuration
 * These settings mirror the server-side environment variables
 * and control the behavior of guest pass generation and verification.
 */

export const guestPassConfig = {
  /**
   * Number of hours before and after arrival_at that the pass is valid
   * Server reads from: Deno.env.get('QR_WINDOW_HOURS')
   */
  QR_WINDOW_HOURS: 12,

  /**
   * Whether passes can only be used once
   * When true, passes are marked as redeemed after first successful scan
   * Server reads from: Deno.env.get('SINGLE_USE')
   */
  SINGLE_USE: false,
} as const;

/**
 * Calculate the valid time window for a guest pass
 */
export function calculateTimeWindow(arrivalAt: Date) {
  const windowMs = guestPassConfig.QR_WINDOW_HOURS * 60 * 60 * 1000;
  return {
    validFrom: new Date(arrivalAt.getTime() - windowMs),
    expiresAt: new Date(arrivalAt.getTime() + windowMs),
  };
}
