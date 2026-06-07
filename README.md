# Multipass Run

[![Ubuntu Tests](https://github.com/geoffreynyaga/multipass-run/actions/workflows/test-ubuntu.yml/badge.svg)](https://github.com/geoffreynyaga/multipass-run/actions/workflows/test-ubuntu.yml)
[![macOS Tests](https://github.com/geoffreynyaga/multipass-run/actions/workflows/test-macos.yml/badge.svg)](https://github.com/geoffreynyaga/multipass-run/actions/workflows/test-macos.yml)
[![Windows Tests](https://github.com/geoffreynyaga/multipass-run/actions/workflows/test-windows.yml/badge.svg)](https://github.com/geoffreynyaga/multipass-run/actions/workflows/test-windows.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/visual-studio-marketplace/v/GeoffreyNyaga.multipass-run)](https://marketplace.visualstudio.com/items?itemName=GeoffreyNyaga.multipass-run)

VS Code extension for managing Multipass virtual machine instances from the sidebar.

<img src="media/hero.png" alt="Multipass Run sidebar" width="800">

- Manage Ubuntu, Fedora, Debian, and Ubuntu Core instances from the sidebar.
- Create instances with default, custom, or cloud-init configurations.
- Take, list, restore, and delete snapshots on stopped instances.
- Mount and unmount host folders per instance.
- Connect with Remote-SSH using a generated ed25519 key.

## Install

### Prerequisites

- Visual Studio Code 1.105.0 or later.
- Multipass installed and on `PATH`. Verify with `multipass version`.

For Multipass prerequisites and OS-specific installation steps, use the upstream guide:

- [Install Multipass](https://documentation.ubuntu.com/multipass/latest/how-to-guides/install-multipass/)

### Install the extension

From the Marketplace:

1. Open the Extensions view (`Cmd+Shift+X` on macOS, `Ctrl+Shift+X` on Linux and Windows).
2. Search for `Multipass Run`.
3. Select **Install**.

From a VSIX file:

```bash
code --install-extension multipass-run-0.1.0.vsix
```

## How-to guides

For Multipass lifecycle, mounts, snapshots, and cloud-init workflows, use the upstream docs:

- [Multipass how-to guides](https://documentation.ubuntu.com/multipass/latest/how-to-guides/)
- [Manage instances](https://documentation.ubuntu.com/multipass/latest/how-to-guides/manage-instances/)

### How to launch with cloud-init

1. Save your cloud-init YAML. The file must start with `#cloud-config`.
2. Right-click the file in the Explorer and select **Launch VM with this cloud-init**, or click **+** in the sidebar and select **Open cloud-init YAML**.
3. Enter an instance name when prompted.

### How to connect with Remote-SSH

The extension generates an ed25519 key pair on first use and writes a wrapped block into `~/.ssh/config`. To connect, click **SSH** in the instance detail panel.

## Reference

### Commands

| Title | ID |
|---|---|
| Refresh instance list | `multipass-run.refresh` |
| Create instance menu | `multipass-run.createInstanceMenu` |
| Prune orphaned SSH entries | `Multipass: Prune Orphaned SSH Entries` |

### Instance states

| State | Meaning |
|---|---|
| Running | Active. |
| Stopped | Powered off. |
| Suspended | Paused and saved to disk. |
| Creating | Being provisioned. |
| Starting | Booting. |
| Stopping | Shutting down. |
| Deleting | Moving to deleted state. |
| Recovering | Restoring from deleted state. |
| Deleted | In trash. Recoverable until purged. |

## Security

| Area | Behaviour |
|---|---|
| SSH key | ed25519 by default. Existing `multipass_id_rsa` is kept for backward compatibility. Last-VM purge offers to remove the key pair. |
| Config block | Wrapped in `# >>> multipass-run: <name>` / `# <<<` markers. Legacy entries are auto-migrated. |
| Host keys | `StrictHostKeyChecking accept-new` with the standard `known_hosts`. Purge runs `ssh-keygen -R`. |
| Guest key install | `multipass transfer` plus idempotent append. No shell interpolation of the public key. |
| Hygiene | Orphaned config blocks for missing VMs are auto-pruned at activation and via the **Prune Orphaned SSH Entries** command. |

## Contributing

Open issues and pull requests at the [GitHub repository](https://github.com/geoffreynyaga/multipass-run).

## License

MIT. See [LICENSE](LICENSE).

## See also

- [Multipass documentation](https://multipass.run/docs)
- [Changelog](CHANGELOG.md)
