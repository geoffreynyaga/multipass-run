// Centralized timing configuration for polling, timeouts, and intervals
// across the extension. Tune behavior here rather than chasing magic numbers
// through call sites. All values are in milliseconds unless the name says
// otherwise.

// ─── Launch progress (named launches) ───────────────────────────────────────
// `multipass launch` blocks until cloud-init finishes — minutes after the VM
// is already Running and SSH-able. We race the CLI against a state poll;
// whichever proves the VM is ready first wins.
export const LAUNCH_PROGRESS_POLL_INTERVAL_MS = 3000;
export const LAUNCH_PROGRESS_MAX_WAIT_MS = 5 * 60 * 1000;

// ─── Existing-VM start ──────────────────────────────────────────────────────
// When mounting into a stopped VM we `multipass start` and then wait for
// Running. 20 × 3 s = 60 s ceiling; mount aborts past that.
export const INSTANCE_START_POLL_INTERVAL_MS = 3000;
export const INSTANCE_START_MAX_POLL_ATTEMPTS = 20;

// ─── Post-launch state polling ──────────────────────────────────────────────
// Watch a known instance until it reports Running. 60 attempts × 2 s = 2 min
// ceiling, which is generous for the state-transition window after launch.
export const INSTANCE_STATE_POLL_INTERVAL_MS = 2000;
export const INSTANCE_STATE_MAX_POLL_ATTEMPTS = 60;

// ─── Pending-launch reconciliation ──────────────────────────────────────────
// Flag a persisted pending launch as "stuck" if `multipass list` still hasn't
// surfaced the VM after this long — usually means a stalled image download.
export const PENDING_LAUNCH_STUCK_THRESHOLD_MS = 5 * 60 * 1000;

// ─── SSH setup ──────────────────────────────────────────────────────────────
// Polling starts AFTER `multipass launch` returns, so this covers the
// state-propagation window (Running flag + IP assignment), not the image
// download. 1 s interval keeps the popup snappy when the VM boots fast;
// 90 attempts (90 s ceiling) gives the daemon room on slow hosts.
export const SSH_SETUP_POLL_INTERVAL_MS = 1000;
export const SSH_SETUP_MAX_POLL_ATTEMPTS = 90;

// Per-step ceilings inside setupSSHForInstance. Without these, a hung
// `multipass exec` blocks until the daemon gives up (~10 min observed),
// which freezes the progress notification. Failing each step in tens of
// seconds surfaces a real error toast the user can act on.
export const SSH_KEYGEN_TIMEOUT_MS = 15000;
export const SSH_MULTIPASS_VERSION_TIMEOUT_MS = 5000;
export const SSH_GUEST_EXEC_TIMEOUT_MS = 30000;
export const SSH_PROBE_TIMEOUT_MS = 15000;

// ─── Activation ─────────────────────────────────────────────────────────────
// Delay after activation before the auto-prune SSH sweep, giving the
// multipass daemon time to respond to its first list query.
export const AUTO_PRUNE_DELAY_MS = 3000;

// ─── Inline-form launches (potentially unnamed) ─────────────────────────────
// Multipass picks a random name during launch when no --name is passed, so we
// can't seed an optimistic placeholder. Poll `multipass list` periodically
// during launch so the new row surfaces as soon as it's registered. Hard cap
// protects against a hung CLI keeping the interval alive forever.
export const INLINE_LAUNCH_REFRESH_INTERVAL_MS = 2000;
export const INLINE_LAUNCH_MAX_DURATION_MS = 10 * 60 * 1000;
