// Centralized timing configuration for polling, timeouts, and intervals
// across the extension. Tune behavior here rather than chasing magic numbers
// through call sites. All values are in milliseconds unless the name says
// otherwise.

// ─── Post-launch state polling ──────────────────────────────────────────────
// Watch a known instance until it reports Running. 60 attempts × 2 s = 2 min
// ceiling, which is generous for the state-transition window after launch.
export const INSTANCE_STATE_POLL_INTERVAL_MS = 2000;
export const INSTANCE_STATE_MAX_POLL_ATTEMPTS = 60;

// ─── Inline-form launches (potentially unnamed) ─────────────────────────────
// Multipass picks a random name during launch when no --name is passed, so we
// can't seed an optimistic placeholder. Poll `multipass list` periodically
// during launch so the new row surfaces as soon as it's registered. Hard cap
// protects against a hung CLI keeping the interval alive forever.
export const INLINE_LAUNCH_REFRESH_INTERVAL_MS = 2000;
export const INLINE_LAUNCH_MAX_DURATION_MS = 10 * 60 * 1000;
