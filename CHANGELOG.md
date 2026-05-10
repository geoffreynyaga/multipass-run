# Change Log

## [0.0.5] - 2026-05-10

### Added
- **Snapshots**: take, list, restore, and delete from the sidebar
  detail panel. Inline form for optional name/comment. Modal
  confirmation on destructive actions
- **Mounts**: add a host folder via folder picker and unmount via
  per-row button. Fixes the previously non-functional `+` button
- **macOS Full Disk Access hint** under the Mounts section, with a
  one-click link to System Settings → Privacy & Security → Full Disk
  Access. Documents the empty-mount symptom in the README

### Changed
- **Detail view redesign** inspired by `claude-design/screens-detail`:
  primary action row (Shell / SSH / Stop / Pause), dense KV layout,
  inline mounts and snapshots, single Delete CTA
- Detail view now uses the authoritative state from the list rather
  than potentially stale `multipass info` output, fixing the wrong
  button set after a Stop or Suspend
- Optimistic transition pills (Pausing… / Stopping… / Starting…) for
  instant feedback on action clicks
- CPU / Memory / Disk / IP / Zone metrics are hidden for non-Running
  states so suspended instances no longer render `NaN GB`
- Mount entries now use the correct host source / instance target
  ordering (multipass JSON keys mounts by target path)

## [0.0.4] - 2026-05-05

### Added
- **Cloud-init YAML launch** from sidebar (Open cloud-init YAML) and Explorer right-click
- **Open in Multipass** Explorer entry point — mount any folder into a VM
- Cloud-init detection and validation before launch

### Changed
- Refactored App.tsx — extracted InstallMissingScreen, DaemonErrorScreen, and Icons into components
- Pruned dead code from MultipassService (21 unused exports, 5 dead class members)
- SSH popup Cancel now redirects to the Multipass sidebar

## [0.0.2] - 2025-11-09

### Added

- **Multi-Distribution Support**: Extended beyond Ubuntu to support Fedora, Debian, and Ubuntu Core
  - Distribution-specific icons for each OS (with light and dark theme variants)
  - Automatic icon selection based on the instance's operating system
  - Proper release name formatting for all distributions
- **Remote-SSH Integration**: One-click SSH connection to instances
  - Automatic SSH key generation (RSA 4096-bit)
  - SSH config file management for seamless connections
  - Automated authorized_keys setup on instances
  - Integration with VS Code's Remote-SSH extension
- Enhanced instance creation flow with accurate OS information display
- Distribution-aware instance list UI with OS-specific branding

### Fixed

- Distribution names now display correctly (e.g., "Fedora 43" instead of "Ubuntu 43")
- Fixed icon display during instance creation - no longer shows Ubuntu icon for non-Ubuntu instances
- Improved image caching detection for multiple distributions
- Enhanced version extraction logic for different OS formats

### Changed

- Updated instance display to show correct OS names from Multipass API
- Improved release name formatting by removing OS prefix in instance details
- Enhanced UI to use distribution-specific icons throughout the interface

### Testing

- Added comprehensive CI/CD workflows for Ubuntu, macOS, and Windows
- Implemented proper headless testing support for Linux CI environments
- Enhanced E2E test reliability with better error handling
- All 113 tests passing across platforms

### Documentation

- Updated README with multi-distribution support information
- Added Remote-SSH integration documentation
- Included screenshots showcasing distribution-specific features
- Enhanced how-to guides and feature descriptions

## [0.0.1] - Initial Release

- Initial release with basic Multipass instance management
- Create, start, stop, suspend, delete, and recover instances
- Instance information display with system metrics
- Shell access integration
- Ubuntu instance support
