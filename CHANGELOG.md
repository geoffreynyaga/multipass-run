# Change Log



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
