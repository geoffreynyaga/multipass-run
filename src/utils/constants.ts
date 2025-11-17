export const MULTIPASS_PATHS = [
	'multipass',                    // Try PATH first (works for most installations)
	'/snap/bin/multipass',          // Snap installation (Ubuntu/Linux)
	'/usr/local/bin/multipass',     // Standard Linux installation
	'/opt/homebrew/bin/multipass'   // Homebrew on Apple Silicon Macs
];
