// Centralized timing configuration for polling, timeouts, and intervals
// across the extension. Tune behavior here rather than chasing magic numbers
// through call sites. All values are in milliseconds unless the name says
// otherwise.

// ─── Inline-form launches (potentially unnamed) ─────────────────────────────
// Multipass picks a random name during launch when no --name is passed, so we
// can't seed an optimistic placeholder. Poll `multipass list` periodically
// during launch so the new row surfaces as soon as it's registered. Hard cap
// protects against a hung CLI keeping the interval alive forever.
export const INLINE_LAUNCH_REFRESH_INTERVAL_MS = 2000;
export const INLINE_LAUNCH_MAX_DURATION_MS = 10 * 60 * 1000;
