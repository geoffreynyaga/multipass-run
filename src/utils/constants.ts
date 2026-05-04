export const MULTIPASS_PATHS = [
	'multipass',                                                            // PATH lookup (works when shell PATH is inherited)
	'/snap/bin/multipass',                                                  // Snap (Ubuntu/Linux)
	'/usr/local/bin/multipass',                                             // Standard Linux + macOS pkg symlink
	'/opt/homebrew/bin/multipass',                                          // Homebrew on Apple Silicon
	'/Library/Application Support/com.canonical.multipass/bin/multipass',   // macOS pkg installer canonical location
	'C:\\Program Files\\Multipass\\bin\\multipass.exe'                      // Windows installer default
];

export const MAX_VM_NAME_DISPLAY_CHARS = 24;
