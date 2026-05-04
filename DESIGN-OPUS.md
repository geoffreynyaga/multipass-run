# Multipass Run — Opus Execution Plan

This is the working implementation plan for the Multipass Run redesign. It merges:

- `DISCUSSION.md` decisions and inline replies.
- `claude-design/DESIGN.md` as the visual source of truth.
- `claude-design/*.jsx` snippets as reference implementations, not files to copy blindly.
- Current repo structure in `src/extension.ts`, `src/webview/*`, `src/extension-utils/*`, and `src/utils/*`.

The aim is incremental execution: small reviewable changes, each committed after it is tested. UI changes should reference the Claude design folder before implementation.

## Ground Rules

- Keep the extension native to VS Code. Use VS Code APIs for editor, diagnostics, output channels, QuickPick, status bar, terminals, and settings.
- Treat `claude-design/tokens.css` and `claude-design/DESIGN.md` as the design baseline.
- Prefer one feature per commit. Avoid mixing command logic, visual polish, and docs in the same commit unless the change is tiny.
- Update docs when behavior changes: `README.md`, `DESIGN.md`, this file, and tests where useful.
- Run `pnpm run compile-tests` after TypeScript changes.
- Run focused Jest tests when touching utilities.
- Run `npx fallow` after markdown edits if available.

## Current State

Already done or mostly done:

- Pending launch persistence exists via `PendingLaunchStore`, `mergePendingIntoLists`, and `reconcilePending`.
- SSH hardening work appears partly landed: ed25519 migration path, managed SSH blocks, key removal prompt, and Remote-SSH fallback should be verified before calling complete.
- E2E Mocha `this` typing compile errors are fixed.

Still needs execution:

- Sidebar visual redesign and details action row.
- Create menu naming and order.
- OS-aware Multipass install flow.
- Profiles in VS Code settings.
- Cloud-init editor, validation, templates, launch flow, and save-as-profile.
- Mount workspace.
- Status bar item.
- Backlog: snapshots, clone, logs, networking row, port forwarding.

## Phase 0 — Audit And Stabilize

Goal: confirm what is genuinely done before building on it.

Work:

- Verify pending launch persistence behavior on refresh and webview reload.
- Verify SSH hardening against `DISCUSSION.md`: `accept-new`, ed25519 for new installs, legacy RSA compatibility, bracket markers, purge-only SSH config cleanup, transfer-only public key install, last-instance key removal prompt.
- Clean up obvious formatting/indentation issues in `src/extension.ts` only if touched by the audit.
- Add or update focused tests around pending launches and SSH config parsing if gaps exist.

Geoff reviews/tests:

[x] Create an instance with an uncached image, hit Refresh while it is downloading, confirm the synthetic row stays visible.
[x] Purge an instance and confirm only purge removes SSH config.
[x] Recover a soft-deleted instance and confirm the old SSH config behavior is acceptable.

Commit shape:

- `Verify pending launches and SSH hardening`

## Phase 1 — Sidebar List And Detail Polish

Goal: make the everyday sidebar match the approved design direction without changing major data flow.

References:

- `claude-design/DESIGN.md` sections `§2 Instance list` and `§3 Instance detail`.
- `claude-design/screens-list.jsx`, especially `ListA` and possibly `ListD`.
- `claude-design/screens-detail.jsx`, especially `DetailB` as the first practical implementation target.

Work:

- Replace ambiguous arrows with thin chevrons and `title`/ARIA labels.
- Add VM-name ellipsis and full-name tooltip.
- Use grouped status sections if this is not too large: Running, Suspended, Stopped, Deleted.
- Keep numbers for CPU, memory, disk. Do not add resource bars in this pass.
- Keep Zone visible, but render missing values as `--`.
- Keep Delete as red text, shorten label to `Delete`, and add hover underline.
- Add detail action row:
  - Running: Pause, Stop, Shell, SSH, Delete.
  - Stopped: Start, Shell-after-start if needed, Delete.
  - Suspended: Resume, Delete.
  - Deleted: Recover, Purge.
- Wire explicit SSH action from details/list so SSH setup is user-triggered.

Geoff reviews/tests:

- Check long VM names in narrow sidebar.
- Check running, stopped, suspended, deleted states.
- Confirm action row placement feels right and Delete does not look too heavy.
- Confirm SSH popup only appears when explicitly requested or after first SSH setup, not when merely clicking a VM.

Commit shape:

- `Polish instance list and detail actions`

## Phase 2 — Create Menu Rename And Order

Status: done.

Goal: make launch choices simpler and less repetitive.

Final order:

1. `Default` — Ubuntu LTS, 1 CPU / 1G / 5G.
2. `Custom` — Pick CPU, RAM, disk.
3. `Cloud-init` — Launch from cloud-init YAML.
4. `Profile` — Use a saved configuration.

Work:

- Update QuickPick labels and descriptions.
- Rename YAML wording to Cloud-init everywhere user-facing.
- Add command ids only when implementing the backing feature. Do not create dead commands unless needed for a placeholder.
- Rename SSH popup buttons to `Connect now`, `Open Remote-SSH View`, and `Cancel` or the closest native VS Code message wording.

Geoff reviews/tests:

- Open create menu from the sidebar plus button and Command Palette.
- Confirm labels are obvious to a new user and still precise for experts.

Commit shape:

- `Simplify launch menu labels`

## Phase 3 — OS-Aware Multipass Install Flow

Goal: the not-installed screen should help the user install Multipass from inside VS Code without silent elevation.

References:

- `claude-design/screens-empty.jsx`
- `claude-design/screens-features.jsx` `InstallDetect`

Work:

- Detect platform and package manager:
  - macOS: prefer `brew install --cask multipass` when `brew` exists.
  - Linux: prefer `snap`, then `apt`, then `dnf`; fallback to docs.
  - Windows: prefer official download page, offer `winget install Canonical.Multipass` if `winget` exists.
- Add primary CTA when command is available: open integrated terminal with command pre-typed. The user presses Enter.
- Add secondary CTA: copy command.
- Keep official download page as fallback.
- Refresh after install remains manual via Refresh button.

Geoff reviews/tests:

- macOS with Homebrew installed.
- macOS without Homebrew if possible.
- Linux package manager detection can be unit-tested with mocked command lookup.
- Windows path should be reviewed by code and docs if not locally testable.

Commit shape:

- `Add OS-aware Multipass install guidance`

## Phase 4 — Profiles In VS Code Settings

Goal: store reusable launch configurations in `settings.json` with schema validation and Settings Sync support.

References:

- `claude-design/DESIGN.md` `§7 Profiles`.
- `claude-design/screens-features.jsx` `ProfilesSettings`.

Work:

- Add `multipassRun.profiles` to `package.json` `contributes.configuration`.
- Define profile shape:
  - `distro`
  - `cpus`
  - `memory`
  - `disk`
  - `cloudInit`
  - `mounts`
  - `postCreate`
- Implement `Profile` type and settings reader.
- Implement `Profile` launch menu path.
- Add command to open settings JSON at or near `multipassRun.profiles`.
- After successful Custom or Cloud-init launch, offer `Save as profile?`.

Geoff reviews/tests:

- Add a valid profile in User settings and launch from it.
- Add an invalid profile and confirm VS Code settings schema flags it.
- Confirm Settings Sync friendliness is documented.

Commit shape:

- `Store launch profiles in VS Code settings`

## Phase 5 — Mount Workspace

Goal: make local project-to-VM workflows easy.

References:

- `claude-design/screens-features.jsx` `MountFlow`.

Work:

- Add command: `Mount workspace...`.
- Entry points: detail action/section first; right-click menu later if needed.
- Source picker:
  - Current workspace folder.
  - Pick folder.
  - Custom path.
- Guest target default: `/home/ubuntu/<workspace-name>`.
- Run `multipass mount <host> <vm>:<guest>`.
- Display mounts in details panel.
- Add unmount action.
- Warn if mounting a folder containing heavy directories such as `node_modules`.

Geoff reviews/tests:

- Mount current repo into a running VM.
- Stop/start VM and confirm display remains understandable.
- Unmount and confirm details refresh.

Commit shape:

- `Add workspace mount flow`

## Phase 6 — Status Bar Item

Goal: give a small global signal without crowding the sidebar.

References:

- `claude-design/screens-features.jsx` `StatusBar`.

Work:

- Use `vscode.window.createStatusBarItem`.
- Initial version: one item, e.g. `$(vm) 2 running`.
- Tooltip lists running, starting, and pending instances.
- Click focuses the Multipass Run sidebar.
- Optional later: split into multiple status bar items for running count and pending/error count if it proves useful.

Answer to the open question:

- Yes, VS Code can have multiple extension-owned status bar items. Start with one combined item because it is quieter; split later only if the states need separate commands.

Geoff reviews/tests:

- Status bar updates after create/start/stop/delete/refresh.
- Click behavior focuses the view.

Commit shape:

- `Add Multipass status bar item`

## Phase 7 — Cloud-init Center Editor

Goal: expert YAML flow belongs in the center editor, not squeezed into the sidebar.

References:

- `claude-design/DESIGN.md` `§6 Cloud-init editor`.
- `claude-design/screens-create.jsx` `CloudInitA`.

Primary UX:

- Create menu item: `Cloud-init`.
- QuickPick:
  - `Open file...`
  - `New from template`
  - `Paste inline`
- All paths converge into a YAML editor in the center.
- Validate on open/save/change with diagnostics.
- Show verbose validation in output channel `Multipass: Cloud-init`.
- Launch only when valid, with a confirmation prompt for risky directives.
- After successful launch, offer to save as a profile.

Implementation:

- Use `js-yaml` for parsing.
- Use `ajv` and a vendored cloud-init JSON schema for semantic validation.
- Add `DiagnosticCollection` for inline squiggles.
- Add a `CodeLensProvider` or explicit command button path for `Launch with cloud-init`.
- Add templates in `media/cloud-init/`:
  - `basic.yaml`
  - `docker.yaml`
  - `dev-tools.yaml`
  - `django.yaml`
- Launch via `multipass launch --cloud-init <path>` or a temp file for inline/untitled content.

Risk warnings:

- Warn when YAML includes `runcmd`, `bootcmd`, `write_files`, `users`, `ssh_authorized_keys`, custom apt sources/keys, plaintext `chpasswd`, `phone_home`, remote `user_data`/`vendor_data`, or host-ish mounts.
- Banner/warning text should say: cloud-init runs as root inside the guest; only launch from trusted sources.

Geoff reviews/tests:

- Open a valid file, validate, launch.
- Paste invalid YAML and confirm squiggles plus output channel error.
- Use a template and save as profile.
- Try risky YAML and confirm the warning appears before launch.
- Confirm older Multipass versions that emit poor errors still surface useful output.

Commit shape:

- `Add cloud-init templates`
- `Add cloud-init validation diagnostics`
- `Launch instances from cloud-init`
- `Save cloud-init launches as profiles`

## Phase 8 — Backlog Features

These are good, but should not block the main redesign.

Snapshots:

- Details section: `SNAPSHOTS (N)` and `Take snapshot`.
- Restore/delete per snapshot.
- Respect Multipass state restrictions.

Clone:

- Right-click only.
- Prompt for new name.
- Use `multipass clone`.

Logs:

- Right-click `View logs...`.
- Default service: `cloud-init`.
- Stream to output channel.

Networking row:

- Details row for bridge and IP.
- Defer full graph.

Port forwarding:

- Add forward `hostPort -> vmPort`.
- Use SSH tunnels.
- Track processes in globalState.
- Stop forwards on VM stop/delete.

Commit shape:

- One feature per commit.

## Suggested Execution Order

1. Phase 0: audit what already landed.
2. Phase 2: create menu rename. Small, confidence-building.
3. Phase 1: sidebar/detail visual polish.
4. Phase 6: status bar item.
5. Phase 3: install flow.
6. Phase 4: profiles.
7. Phase 5: mount workspace.
8. Phase 7: cloud-init editor.
9. Phase 8: backlog features.

Reasoning:

- Rename/menu work is tiny and unblocks the mental model.
- Sidebar/detail polish gives immediate user-visible value.
- Status bar is small and answers the feasibility question.
- Profiles should land before cloud-init save-as-profile.
- Cloud-init is largest and should be built after the launch/profile foundations are calmer.

## Open Decisions

- Whether list grouping should be implemented in the first sidebar pass or after simpler row polish.
- Whether details should follow `DetailB` first, then evolve toward `DetailA`, or go straight to action-first layout.
- Windows install flow hierarchy: official installer first vs winget first. Current plan: official installer first, winget as secondary.
- Cloud-init schema source and vendoring process.
- Whether to add a custom webview editor later for cloud-init, after the native YAML editor path works.
