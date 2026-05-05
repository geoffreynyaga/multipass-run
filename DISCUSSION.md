# Multipass Run — Discussion

Reply inline using `>` blockquotes under each section. Add new `### Notes` subsections wherever you want.

remember to run `npx fallow` after editing to update the rendered markdown.

do not market yourself in commits
design masterpirce and thinking is required for UI changes if relevant change has been done.


---

## 1. Design critique (screenshots)

### Strengths

- List item card clean. Distro icon + version + IP + state badge = right info at glance.
- Status colors map to `DESIGN.md` (green RUNNING, orange DOWNLOADING).
- Empty state with orange "!" circle on-brand. Sidebar nav restrained.

>

### Issues

- **Arrow icons (↑/↓) ambiguous.** Screenshot 1 shows `↓` next to running VMs — looks like "download" or "expand". Real meaning unclear (selected? active?). Replace with explicit chevron + tooltip, or drop entirely.

> can we then use chevron down/up ? make sure they are thin.

**A:** Yes. Use codicon `chevron-up` / `chevron-down`, 14px, `stroke-width: 1`. Wrap in `<button aria-label="Expand details">` w/ tooltip via `title` attr.

- **No VM-name truncation cue.** Long names will collapse layout. Need ellipsis + `title` tooltip.

> agreed. not sure aboout the length but we can abstract taht to a global values/config file.

**A:** Add `MAX_VM_NAME_DISPLAY_CHARS` (default 24) to `src/utils/constants.ts`. CSS handles overflow via `text-overflow: ellipsis`; `title` attr always carries full name. No hard truncation in data layer.

- **Details panel "ACTIVE" header redundant** when only one VM selected. Also `ZONE: N/A` wastes space — multipass single-host has no zones. Hide if N/A.

> no keep it. zones is enabled in the latest multipass which i;m not running/instakled yet

**A:** Keep field. Render `--` (matches MOUNTS style) instead of `N/A` for visual consistency.

- **`DELETE INSTANCE` red link bottom of details is weak.** Destructive action deserves bordered danger button (your `DESIGN.md` `.btn-danger`), not a flat text link. Also far from other lifecycle actions — inconsistent.

> i only have red text which i think look better that something that ill liik like a button

**A:** Keep red text. Add subtle underline on hover so it reads as actionable. Confirmation modal already gates it.

- **No primary actions in details panel.** Can't Stop/Suspend/Shell/SSH from details view — only via right-click on list item. Discoverability bad. Add action row in details.

> ok, we can have pause/stop in the left side f the delete instance row. then at the center have the shell and ssh button, then delete on the right sode. all in the same wor, ofcousr use emojis for start top. reduce "delete instance" to delete.

**A:** Layout `flex justify-between` single row:

```
[⏸ Pause] [⏹ Stop]      [💻 Shell] [🔗 SSH]      [🗑 Delete]
```

State-aware: Stopped VM → `[▶ Start]` replaces Pause/Stop. Suspended → `[▶ Resume]`. Delete label shortened to "Delete", red text style preserved. Emojis: ▶ ⏸ ⏹ 💻 🔗 🗑. Will need design pass — happy to swap emojis for codicons (`debug-pause`, `debug-stop`, `terminal`, `remote`, `trash`) if cleaner.

- **No CPU/Memory/Disk progress bars.** `DESIGN.md` defines `.progress-bar` — values shown as `0.22 GB / 0.93 GB` but no visual fill. Cheap win.

> i like the numbers better.

**A:** Skip bars. Keep numbers only.

- **Status badge dot animation missing.** `DESIGN.md` spec says pulse on running. Verify.

> do not imlement this. we already have the "running" text

**A:** Skip. Will also strip pulse spec from `DESIGN.md` so doc matches reality.

- **DOWNLOADING IMAGE state has no progress %.** Multipass CLI emits %; pipe it.

> great. be safe. remember to handle the case where multipass doesn't emit % (e.g. older versions) — show spinner + "Downloading image" without %. also be mindful of not making system hang, we can poll download

**A:** Use `child_process.spawn('multipass', ['launch', ...])` — non-blocking. Stream `stderr` line-by-line; regex `/Retrieving.*?(\d+)%/`. If no `%` in first 5s → fall back to spinner + "Downloading image". Parser is async, never blocks event loop. Update webview at most every 500ms (rate-limit) to avoid render thrash.

- **Create menu (screenshot 6) verbose.** Agree with your `ideas.md` — see §3.

> great. gve me suggestions, render them in the terminal and we discuss on iterations

**A:** Three label options for the QuickPick (pick one):

| Slot       | Option A (terse)   | Option B (verb-led)   | Option C (descriptive)        |
|------------|--------------------|-----------------------|-------------------------------|
| Slot 1     | Default            | Quick launch          | Default Ubuntu LTS            |
| Slot 2     | Custom             | Customize             | Custom CPU / RAM / disk       |
| Slot 3     | Cloud-init         | From cloud-init       | Advanced (cloud-init YAML)    |
| Slot 4     | Profile            | From profile          | Saved profile                 |

My pick: **Option A**. Short, scannable, sub-text already explains. Order per your note: 1 → 2 → 3 → 4. See §4 for finalized table.

- **SSH popup (screenshot 2/5) modal with 3 buttons fine.** But "Show in Remote-SSH" + "Connect Now" overlap mentally. Rename: `Connect Now` / `Open Remote-SSH View` / `Cancel`.

> ok

**A:** Rename only, no logic change.

---

## 2. Cloud-init plan

Status: menu shows "Create from YAML — Coming soon!" (`extension.ts:463`). Not wired.

> we need to change ot to cloud-init from YAML. deliberate about naming becuae its for experts

**A:** Renamed throughout. Command id: `multipass-run.createFromCloudInit`. Menu label: `Cloud-init`. Sub-text: `Launch from cloud-init YAML`.

### Approach (recommended)

1. New command `multipass-run.createFromCloudInit`. Pipeline:
   - VS Code QuickPick: `Open file…` / `Paste inline` / `From template`.
   - If file: `vscode.window.showOpenDialog({ filters: { YAML: ['yaml','yml'] } })`.
   - Validate: parse with `js-yaml`, surface schema errors before launch.
   - Pass via `multipass launch --cloud-init <path>` (it accepts `-` for stdin too).

  > ok, i ned to know if we can have a UI center view to run the checks and gove feedback if sth is broken.
  > ALSO OPTION TO SACE THIS to profiles if successful. should be easy to ignore/cancel

**A:** Two parts:

- **Center UI for validation:** open `untitled:cloud-init.yaml` in editor split. Validate on save via `js-yaml` parse + AJV schema check. Errors surface in Problems panel (red squiggles) + status bar shows `✓ valid` or `✗ N errors`. Only when valid does the "Launch" CodeLens appear at top of file. Click CodeLens → confirmation modal (lists risky directives, see Safety section) → launch.
- **Save to profile after launch:** post-success non-modal toast: `Instance launched. Save config as profile?` with two buttons: `Save…` (prompts profile name) / `Dismiss`. Auto-dismiss after 10s. Saves cloud-init payload + chosen distro/CPU/RAM/disk into `multipassRun.profiles` settings.


2. **Templates folder** in extension: `media/cloud-init/` — ship 3-4 (basic, docker, dev-tools, django). Show in QuickPick with description.

> ok

**A:** Initial set: `basic.yaml`, `docker.yaml`, `dev-tools.yaml` (git/build-essential/zsh), `django.yaml` (python3-venv/postgres-client). All start with `#cloud-config` header + comment block explaining what they do.

3. **Inline editor**: open untitled `.yaml` doc pre-filled with template, user edits, runs command "Multipass: Launch from current YAML".

> ok. just for cloud init. so we need a cloud init parser.if not, we create one.

**A:** No need to write parser. Stack:

- `js-yaml` (small, well-maintained) → parse YAML to object.
- `ajv` + Canonical's published JSON schema (`cloudinit/config/schemas/schema-cloud-config-v1.json` from the `canonical/cloud-init` repo) → validate semantics.
- Vendor schema in `media/cloud-init/schema/` w/ version pin. Add a script (`scripts/update-cloud-init-schema.sh`) that re-fetches it.

4. **Validation tier**: minimal — confirm top-level `#cloud-config` header + valid YAML. Don't reimplement cloud-init schema; let multipass error surface.

> we can have the cloud-init schema during load. if error, show in output channel.

**A:** OK, upgrade tier: full AJV schema check on save. Errors → both Problems panel (inline squiggles) and dedicated `Multipass: Cloud-init` output channel (verbose, full AJV error tree).

### Safety research

- cloud-init runs as root inside guest — by design. Risk: malicious YAML user runs from Twitter could `runcmd` arbitrary commands.
- Mitigation: warn modal before launch when YAML contains `runcmd` / `bootcmd` / `write_files` with executable perms. Show first 50 lines preview. User opt-in.
- Don't auto-trust pasted URLs. If you support `--cloud-init https://...` in future, fetch + show diff first.
- No filesystem mount of host outside what multipass already exposes — safe by default.

> ok. cehck for other things we need to take into considerations, like remote execituon and also goving warnings taht this is their setrings and they should trustg the source.

**A:** Expanded risk list (warn modal flags any of these):

- `runcmd` / `bootcmd` — arbitrary shell on first boot.
- `users:` adding new accounts → privilege escalation if attacker pre-seeds an account.
- `ssh_authorized_keys` → key injection (attacker pre-installs their key).
- `apt:` `sources:` adding 3rd-party repos → supply-chain risk.
- `apt:` `keys:` adding GPG keys → trust extension.
- `write_files:` with world-writable perms (`066[0-7]`/`077[0-7]`) or executable bits.
- `package_update: true` + custom mirror → MITM during boot.
- `chpasswd:` with plaintext passwords.
- `phone_home:` / `vendor_data:` / `user_data:` URLs → exfiltration / remote payload.
- `mounts:` mounting host paths (multipass-side already restricted, but flag anyway).

Banner at top of editor (markdown decoration above line 1):

```
⚠ cloud-init runs as root in the guest. Only launch from trusted sources.
```

Per-launch confirmation modal lists matched directives w/ checkbox `I trust this source`. Default: unchecked → Launch button disabled.

---

## 3. Profiles ("dotfile" idea)

Concrete proposal:

- Storage: `~/.multipass-run/profiles/<name>.json` (or YAML). Out of workspace so reusable across projects.
> cant we have profiles in vscode settings like otehr extensions?

**A:** Yes — better path. Use `contributes.configuration` in `package.json`:

```json
"multipassRun.profiles": {
  "type": "object",
  "default": {},
  "additionalProperties": { "$ref": "#/definitions/profile" }
}
```

Pros:
- Synced via VS Code Settings Sync automatically.
- User edits via `Cmd+,` GUI or `settings.json`.
- Schema validation built-in (red squiggles in `settings.json`).
- No filesystem path to manage.
- Workspace overrides free via VS Code's settings layering — pin a profile in `.vscode/settings.json`.

Read via `vscode.workspace.getConfiguration('multipassRun').get<Record<string, Profile>>('profiles')`. Write via `.update(name, profile, ConfigurationTarget.Global)`.

- Schema: `{ name, distro, cpus, mem, disk, cloudInit?: path|inline, mounts?, postCreate?: shellSnippet }`.
- VS Code surface:
  - `Create from Profile` → QuickPick lists `<name>.json` files.
  - "Save current as profile" command after a Detailed launch — reuse the params.
  - Edit: `multipass-run.editProfile` opens file in editor.
- Workspace override: `.vscode/multipass-profile.json` for project-pinned defaults (analogous to `.devcontainer.json`).

>

**A:** With settings approach above, "edit profile" command becomes `Open Settings (JSON) at multipassRun.profiles`. No separate file to manage.

---

## 4. Create menu naming (`ideas.md` §3)

Proposal:

| Old              | New                       | Sub-text                              |
|------------------|---------------------------|---------------------------------------|
| Create Instance  | **Quick launch**          | Default Ubuntu LTS, 1 CPU / 1G / 5G   |
| Create from Profile | **From profile**       | Reuse saved config                    |
| Create Detailed  | **Custom (CPU/RAM/disk)** | —                                     |
| Create from YAML | **From cloud-init**       | YAML or template                      |

"Quick launch" beats "Create Instance" — verb + outcome. "From cloud-init" educates user about the term they'll see in multipass docs.

> ok, nmot bad we can we go a level easier. also in terns or order, lets have quick launch, the custom, the, cloud init then profiles.

**A:** Final (Option A, your order):

| # | Label          | Sub-text                              |
|---|----------------|---------------------------------------|
| 1 | **Default**    | Ubuntu LTS, 1 CPU / 1G / 5G           |
| 2 | **Custom**     | Pick CPU, RAM, disk                   |
| 3 | **Cloud-init** | Launch from cloud-init YAML           |
| 4 | **Profile**    | Use a saved configuration             |

Single-word labels, sub-text carries detail.

---

## 5. SSH security + delete cleanup audit

Read `src/utils/sshConfig.ts:113-157`. Findings:

- 🔴 **`StrictHostKeyChecking no` + `UserKnownHostsFile /dev/null`**. MITM-vulnerable. Fine for localhost-only multipass (10.x.x.x bridged), risky if user later exposes VM. Document choice in code comment + DESIGN. Better: `StrictHostKeyChecking accept-new`.

> ok

**A:** Switch to `StrictHostKeyChecking accept-new` + standard `~/.ssh/known_hosts` (drop `/dev/null`). First connect trusts, subsequent connects detect tampering. On purge, also strip the host's known_hosts line via `ssh-keygen -R multipass-<name>`.

- 🟡 **RSA 4096**. Modern default = `ed25519`. Smaller, faster, equally strong. Switch.

> ok. make sure it does not break things, and that it works across OS  (wondows,linux, mac) and that multipass accepts it. I want a seamless intergartyion like how WSL does it.

**A:** Compatibility check:

- **OpenSSH ≥ 6.5 (Jan 2014)** supports ed25519. Win10 1803+ ships OpenSSH 7.6+. Modern macOS 9.x+. All current Linux distros.
- **Guest side:** all Ubuntu cloud images since 16.04 use OpenSSH 7+ → ed25519 in `authorized_keys` works fine.
- **WSL parity:** WSL uses ed25519 via `ssh-keygen` defaults since Win10 1809.
- **Multipass:** key-type-agnostic — it just appends to `authorized_keys`.

Migration path: if `~/.ssh/multipass_id_rsa` already exists on user's machine, keep using it (no break). New installs generate `~/.ssh/multipass_id_ed25519`. Detect via file existence + symlink the SSH config `IdentityFile` accordingly.

- 🟡 **Public key check via `grep -F` injection-safe** because piped through `bash -c "..."` with string interp — `publicKey` not user-controlled (read from your generated file), but if file tampered, embedded `"` breaks command. Use `transfer` for both check + append, or pass via stdin.

> ok

**A:** Use `multipass transfer` only — write key to host temp file, transfer, append via `tee -a` inside guest. No string interp into shell.

- 🟡 **`removeSSHConfigForInstance` parser fragile**. Splits on `# Multipass instance:` marker, walks until next `Host`. If user manually edits config (adds blank lines, comments inside block), parser may drop legit entries. Test: write integration test that tampers config + verifies idempotent remove. Better: bracket your block with explicit `# >>> multipass-run` / `# <<< multipass-run` markers (style of `conda init`, `nvm`).

> great

**A:** Switch to bracket markers. Migration path: on first run, detect old `# Multipass instance:` blocks and rewrite w/ bracketed format. Add integration test that scribbles inside the block and verifies idempotent removal.

- 🟡 **Private key path hardcoded** `~/.ssh/multipass_id_rsa`. One key for all instances = convenient but if user purges all VMs, key remains. On last-instance-purge, prompt to remove key.

> ok

**A:** On purge, after `removeSSHConfigForInstance`, count remaining multipass-managed bracket blocks. If zero, prompt: `No more multipass instances. Remove SSH key pair?` → Yes / No / Don't ask again.

- 🟢 **Permissions correct** (700/600/644).

> ok

- 🔴 **Delete vs purge cleanup gap.** `extension.ts:243` `deleteInstance(name, false)` (soft delete) does **not** remove SSH config. Only purge does (line 276). But user may never purge — config grows stale with dead IPs. Fix: remove SSH entry on soft-delete too; re-add on recover (you already have IP at recover time after start).

> not sure. if user soft deletes, they may restore. lets delete ssh confid on purge only.

**A:** Keep current behavior. SSH config only removed on purge. Document trade-off in code comment (so a future contributor doesn't "fix" it).

**Mechanism rating: 6/10.** Works, but parser brittleness + no host-key verification need fixing before v1.0.

> not sure what this is, so no comments

**A:** Was just my own scoring — ignore. After the above fixes ship, rating improves naturally. Will drop the rating from future reviews; not useful w/o shared rubric.

---

## 6. Refresh wipes "downloading" state (`ideas.md` §2)

Reproduced from your description: click `+`, two VMs queue, "DOWNLOADING IMAGE" shows. Hit refresh → list empty.

**Cause:** `MultipassService.getInstanceLists()` only returns what `multipass list` knows. Multipass doesn't register a row until image fetch completes + VM is created. Your "DOWNLOADING IMAGE" is a synthetic row injected client-side during launch, lost on refresh.

### Fix options

- **A. ExtensionContext globalState** (recommended). Track `pendingLaunches: { name, distro, startedAt, pid }[]` in `context.globalState`. Merge into `instanceLists.active` on every refresh until multipass list confirms. Survives webview reloads + window restart.
- B. localStorage in webview — but you lose state on activity-bar tab switch. Skip.
- C. Spawn `multipass launch` with tracked child PID; mark stale if PID dead but VM never appeared (= failure, surface error).

Pair with "stale launch watchdog": if pending > 5 min, show as `Stuck — Retry` with option to cancel/clean.

> ok with what you think is ok and easy to implement

**A:** Going w/ **A** — `ExtensionContext.globalState`. Smallest diff, no PID handling. 5-min watchdog: any `pendingLaunch` older than 5 min that doesn't appear in `multipass list` gets flagged `Stuck` w/ `Retry` / `Cancel` actions. Cancel removes from globalState; Retry re-runs `multipass launch` with same params.

---

## 7. SSH popup on VM you didn't enable (`ideas.md` §3 last paragraph)

Likely cause: `pollInstanceStatus` callback in `extension.ts:354` fires SSH setup once VM hits Running. That's `handleCreateDefaultInstance` flow. If you click on a VM that's still in mid-create, the create callback fires its SSH dialog regardless of whether you "wanted" it.

Need to repro with a fresh VM. Likely: only auto-prompt SSH on first launch flow; never on subsequent VM clicks. Verify in `instanceCreation.ts` — that file likely has the `setupSSHConnection` call.

> ok, try to fix

**A:** Investigate `src/extension-utils/instanceCreation.ts` first (likely calls `setupSSHConnection` unconditionally). Plan: gate behind a `triggerSource: 'create' | 'detail-click' | 'manual'` flag passed only on initial create flow. Detail-view click → no auto-prompt. Add explicit `[🔗 SSH]` button in the action row (§1) for on-demand setup.

---

## 8. Auto-install multipass via terminal + sudo

**Linux:** Yes. `pkexec snap install multipass` or open VS Code terminal with pre-typed `sudo snap install multipass` (user types password). Cleaner: detect `apt` / `dnf` / `snap`, dispatch. Don't run elevation programmatically — VS Code extensions can't `sudo` silently. Open integrated terminal with command, user confirms.

> i dont know what pkexec is. also great point on other ditros. we may need to run some checks to see which package manager they have and then give them the command to run. we can also have a button that copies the command to clipboard.

**A:** `pkexec` = polkit's GUI sudo (graphical password prompt). Skipping it — terminal paste is clearer + works on all desktops.

Detection plan (priority order):

```
which snap → sudo snap install multipass         # canonical-recommended
which apt  → sudo apt install multipass          # fallback (older debs)
which dnf  → sudo dnf install multipass          # community package
which pacman → AUR (link out, can't auto)        # community
```

UI on the "Multipass not found" panel:
- `[Install via terminal]` (primary) → opens integrated terminal, pre-types command, user presses Enter.
- `[Copy command]` (secondary) → copies to clipboard.
- `[Open Download Page]` (tertiary fallback) → current behavior.

**macOS:** No silent install. `.pkg` requires GUI prompts. Best you can do:
- If `brew` present → terminal with `brew install --cask multipass` pre-typed.
- Else → open download link (current behavior). Keep as fallback.

> brew install --cask multipass

**A:** Confirmed.

**Windows:** No silent install for `.exe`. Same as Mac — download link only. `winget install Canonical.Multipass` exists if `winget` ≥ recent — open terminal with that command; if not present, fallback link.

>

**A:** Default plan: detect `winget` via `where winget`. If present → terminal w/ `winget install Canonical.Multipass`. Else → download link. Same pattern as macOS — try terminal first, fallback to link.

**Recommendation:** keep current download-link button as fallback. Add **"Install via terminal"** secondary button that opens integrated terminal with OS-appropriate command pre-typed (not auto-run). User retains control.

> lets try the other way round for MacOS. First try to open the terminal with the brew command, if that fails (e.g. brew not installed), then show the download link.

**A:** Inverted flow (applying same to Linux/Windows for consistency):

1. Detect package manager (brew / snap+apt+dnf / winget).
2. If found → primary CTA = `[Install via terminal]` (pre-typed). Secondary = `[Copy command]`. Tertiary = `[Open Download Page]`.
3. If not found → primary CTA = `[Open Download Page]`. Secondary = short instructions on installing the package manager.

---

## 9. Other end-user wins

- **Mount workspace into VM** with one click: `multipass mount $PWD <vm>:/workspace`. Killer feature for "pocket cloud" framing.

> great great great!!!

**A:** Plan:
- Right-click VM → `Mount workspace…`.
- QuickPick: `Current workspace folder` / `Pick folder…` / `Custom path`.
- Default guest target: `/home/ubuntu/<workspace-name>`.
- Display in details panel under MOUNTS: `~/proj → /home/ubuntu/proj   [unmount]`.
- Persist mount metadata in globalState so we can re-mount across VS Code restarts (multipass remounts on boot anyway, but tracking lets us show the row immediately).
- One-time tip when user mounts a folder containing `node_modules` — multipass mount has known perf issues on huge directory trees. Suggest `.mpignore`-style exclude (multipass doesn't support it natively, but warn).

### 9a. Mount workspace — expanded implementation plan

**Mechanics**
- CLI: `multipass mount <hostPath> <vm>:<guestPath>` to add. `multipass umount <vm>[:<guestPath>]` to remove.
- Read state: `multipass info --format json` already returns `info.mounts[hostPath].target_path`. Currently flattened in `src/commands/getInstanceInfo.ts:85`. Switch to structured array.
- Multipass auto-remounts on VM start. No manual re-mount after reboot.
- VM must be `Running` to mount or unmount. Gate buttons accordingly.
- macOS: first mount can prompt Full Disk Access. Show one-time tip.
- No native exclude support. Warn on heavy dirs only.

**State model**
- Source of truth = `multipass info`. Do not cache mount list.
- `globalState['multipass-run.recentMounts']` stores last-used host path per VM for prefill + optimistic rendering. Not used for re-mounting.

**Files — new**
- `src/commands/mountWorkspace.ts` — registers `multipass-run.mountWorkspace`. Spawns `multipass mount`, returns stdout/stderr.
- `src/commands/unmountWorkspace.ts` — `multipass umount <vm>:<guestPath>`.
- `src/utils/heavyDirScan.ts` — best-effort scan for `node_modules`, `.git`, `target`, `dist`, `venv`, `__pycache__`, `.next`, `build`. Cap walk depth (≤ 2) and time (≤ 200 ms). Returns `{ name, sizeBytes }[]`.
- `src/webview/components/MountDialog.tsx` — port of `claude-design/screens-features.jsx` `MountFlow`.

**Files — edits**
- `src/commands/getInstanceInfo.ts:85` — return `mounts: Array<{ source: string, target: string }>` not joined string. Update `InstanceInfo` interface at `src/commands/getInstanceInfo.ts:18`.
- `src/webview/components/InstanceDetails.tsx:255` — render rows with per-row `[Unmount]` and section header `[+ Mount workspace]`.
- `src/webviewContent.ts` — wire new message types (see protocol below).
- `src/extension.ts` — register two new commands.
- `package.json` — `contributes.commands` + `menus.view/item/context` for right-click on instance tree node.

**Webview ↔ extension message protocol**
- `mount:open { vm }` → extension sends back prefill payload `{ workspaceFolder, suggestedGuest, vmRunning }`.
- `mount:submit { vm, host, guest }` → run `multipass mount`, refresh info, close dialog on success, surface stderr on failure.
- `mount:remove { vm, guest }` → run `multipass umount`, refresh info.

**Error paths**
- Host path missing → block submit before spawn.
- VM not running → disable button, show tooltip.
- Multipass non-zero exit → keep dialog open, render `stderr` in footer.
- Guest path collision (already mounted) → surface multipass error verbatim.

**Build order**
1. Switch `info.mounts` to array end-to-end. Render structured rows in details. No actions yet. (smallest visible win)
2. Add per-row `[Unmount]`.
3. Add `[+ Mount workspace]` button → minimal dialog (current workspace only).
4. Folder picker + custom path source options.
5. Heavy-dir warning card.
6. Right-click context menu entry on instance tree node.

**Geoff reviews**
- Mount current repo into running VM, confirm row appears.
- Stop VM, restart, confirm row still shown after refresh.
- Unmount, confirm row removed.
- Mount path containing `node_modules` ≥ 100 MB, confirm warning shows.

Commit shape: `Add workspace mount flow`.

### 9b. "Open in Multipass" — VS Code Explorer entry points

Two right-click entry points covering the user's pitch: "open any folder in Multipass" + "any cloud-init-shaped YAML launches a new VM."

**Entry 1 — folder / empty-space click in Explorer**

`package.json`:
```json
"contributes": {
  "commands": [
    {
      "command": "multipass-run.openInMultipass",
      "title": "Open in Multipass",
      "category": "Multipass Run"
    }
  ],
  "menus": {
    "explorer/context": [
      {
        "command": "multipass-run.openInMultipass",
        "when": "!resourceScheme || explorerResourceIsFolder",
        "group": "multipass@1"
      }
    ]
  }
}
```

`when` matches: empty-space click (no `resourceScheme`) + folder click. Files skipped to keep menu clean.

Handler `src/commands/openInMultipass.ts`:
- Receives `uri?: vscode.Uri`.
- If `uri` undefined (empty-space) → resolve workspace root:
  - 0 roots → `showOpenDialog` for folder.
  - 1 root → use it.
  - >1 roots → `showQuickPick` of root names.
- If `uri` defined → `vscode.workspace.fs.stat(uri)`. Folder → use `uri.fsPath`. (Files filtered by `when`, but defensive `path.dirname` fallback.)
- Resolve symlinks via `fs.realpath` before passing to `multipass mount` (multipass dislikes some symlink chains).
- Show `vscode.window.showQuickPick`:
  - `$(add) Launch new VM with this folder mounted`
  - For each existing instance: `$(vm) <name>  (<state>)`
- Branches:
  - **New VM** → open existing launch flow. Prefill `mounts: [{ host, guest: '/home/ubuntu/' + path.basename(host) }]`. Run mount post-launch.
  - **Existing Running VM** → open Mount dialog (9a) with source prefilled.
  - **Existing Stopped VM** → quickpick row labeled `(Stopped — will start)`. Run `multipass start`, poll for Running, then mount.

**Entry 2 — cloud-init YAML right-click**

Two-layer detection so the menu only appears on plausible cloud-init files but the command still validates.

Layer 1 — filename `when` (cheap, controls visibility):
```json
{
  "command": "multipass-run.launchWithCloudInit",
  "when": "resourceExtname =~ /^\\.ya?ml$/ || resourceFilename =~ /^(user-data|cloud-init|cloud-config)$/",
  "group": "multipass@1"
}
```

Layer 2 — content sniff at click time. `src/utils/cloudInitDetect.ts`:
- Read first 4 KB via `vscode.workspace.fs.readFile`.
- Strict match: first non-blank line equals `#cloud-config`. → accept.
- Loose match: parse YAML, check for any top-level key in `{ users, runcmd, bootcmd, write_files, package_update, apt, ssh_authorized_keys, chpasswd, packages, snap, ca-certs, ntp, timezone, locale }`. → accept.
- Neither → `showWarningMessage('Doesn't look like cloud-init. Launch anyway?', 'Launch', 'Cancel')`.

Handler `src/commands/launchWithCloudInit.ts`:
- Run risk-scan (per `DISCUSSION.md` §6 — flag `runcmd`, `write_files`, `users`, `ssh_authorized_keys`, custom apt sources, plaintext `chpasswd`, `phone_home`, host-side mounts).
- If risky → confirmation dialog listing offending keys.
- Open existing launch flow with `cloudInitPath: uri.fsPath` prefilled. Multipass reads the file directly via `--cloud-init <path>` — no copy.

**Files — new**
- `src/commands/openInMultipass.ts`
- `src/commands/launchWithCloudInit.ts`
- `src/utils/cloudInitDetect.ts`

**Files — edits**
- `package.json` — 2 commands, 2 menu entries.
- `src/extension.ts` — register both.
- Launch flow accepts prefilled `{ cloudInitPath?, mounts? }` payload. Reuses 9a mount mechanics post-launch.

**Edge cases**
- No workspace open + folder click via `showOpenDialog` → still works, not workspace-bound.
- Multi-root + empty-space click → cannot infer which root. Quickpick is the only honest fallback.
- File with `#!/usr/bin/env` shebang or HTML comment first line → fails strict, falls through to schema sniff.
- Symlink-to-dir → `realpath` before mount.
- Cloud-init from arbitrary file = arbitrary code execution at first boot. Reuse risk-scan; never auto-launch without warning when risky keys present.

**Build order**
1. Folder + empty-space `Open in Multipass` → existing instance only (Running). Reuse 9a mount dialog.
2. Add `Launch new VM` branch with mount prefill.
3. Add Stopped-VM auto-start path.
4. Cloud-init YAML detector + right-click entry.
5. Risk-scan integration (depends on §2 cloud-init UI risk-scan, can ship behind the unscanned warning until then).

Commit shape: `Add Open in Multipass explorer entry` + `Add cloud-init YAML right-click launcher`.

- **Snapshot UI**: list/create/restore. Multipass supports it, your details panel shows `SNAPSHOTS 0` but no action.

> ok.

**A:** Section in details panel: `SNAPSHOTS (N)` + `[+ Take snapshot]`. Click count → expand list w/ `Restore` / `Delete` per row. Snapshot only allowed when VM stopped (multipass restriction) — gate button accordingly.

- **Clone instance** (`multipass clone`).

> ok. only on right click though

**A:** Right-click only. `Clone…` → input box for new name → `multipass clone <src> --name <new>`. Requires source stopped — show inline hint if running.

- **Resource live charts** (CPU load over 60s) using existing poll.

> not sure

**A:** Skipping for v1. Revisit if users ask.

- **Quick-launch from `package.json` / `requirements.txt`** — detect repo type, suggest profile.

> overkill for now, but we can try

**A:** Defer to v1.1+. Logging as backlog.

- **Port forwarding helper** (`ssh -L`) — common dev need; UI to add forwards.

> ok. but i ned explanation and scenarios

**A:** What it is: SSH can tunnel host port → guest port. From host `localhost:HOSTPORT` → VM `localhost:VMPORT`. Like AWS port-forwarding via Session Manager, but free and local.

Scenarios:

1. **Dev server preview.** Django/Flask/Node runs in VM on `:8000`. Host browser opens `http://localhost:8000` → traffic tunneled into VM. No firewall config, no VM IP juggling.
2. **Database access.** Postgres in VM on `:5432`. DBeaver/psql/TablePlus on host connects to `localhost:5432`. VM's DB stays unreachable from network — only your host sees it.
3. **Hot-reload bundlers.** Vite/Webpack on VM `:5173`. Host browser hits `localhost:5173` w/ live reload working through the tunnel.
4. **Multiple parallel VMs same port.** VM-A maps host `:8000`, VM-B maps host `:8001`, both forward to guest `:8000`. No collisions on host.
5. **Reverse forward (`-R`).** Host service on `:6379` (Redis) → exposed inside VM `:6379`. Useful if VM workload needs to reach a host-side cache.

Implementation:
- Spawn detached `ssh -N -L <hostPort>:localhost:<vmPort> multipass-<vm>` per forward.
- Track `{ vm, hostPort, vmPort, pid, direction: 'L'|'R' }` in globalState.
- Details panel section `PORT FORWARDS` w/ `[+ Add]`. Each row: `host:8000 → vm:8000   [stop]`.
- On VM stop/delete → kill all forwards for that VM.
- On extension reload → re-spawn from globalState.

- **Status bar item** showing running VM count + click → focus sidebar.

> ok

**A:** `$(vm) 2` in bottom-right (codicon `vm`). Tooltip lists running VM names. Click → `workbench.view.extension.multipass-run-view`.

- **Logs viewer**: `multipass exec <vm> -- journalctl -u <svc>` in output channel.

> ok

**A:** Right-click VM → `View logs…` → input service name (default `cloud-init` for first launch, useful for debugging stuck launches). Stream into output channel `Multipass: <vm> logs`. Add `--follow` toggle so it can stay live.

- **Networking visualization**: which VMs share bridge, which IPs.

> ok

**A:** Modest scope: details panel `NETWORK` row → bridge name + IP. Defer full topology graph to later.

---

## Suggested order

Pick one to spike. Recommended:

1. **#6 pending-launch persistence** — small, fixes obvious bug, unblocks confidence in #2 cloud-init flow which has same race.
2. **#5 SSH cleanup on soft-delete + bracket markers** — security hardening, small diff.
3. **#2 cloud-init UI** — bigger; design doc first.

> redo this order based on our discussion from my comments.

**A:** Reordered by your enthusiasm + dependency chain + size:

| #  | Status | Task                                                              | Size | Why this slot                          |
|----|--------|-------------------------------------------------------------------|------|----------------------------------------|
| 1  | ✅ done | #6 Pending-launch persistence (globalState + 5-min watchdog)      | S    | Fixes visible bug, foundational        |
| 2  | ⏭ skipped for now | #7 SSH popup gating (instanceCreation.ts)              | S    | Quick win, tied to creation flow       |
| 3  | todo   | #1 Details action row + chevrons + Delete label + truncation      | M    | Visible UX polish, single design pass  |
| 4  | ✅ done | #5 SSH hardening (ed25519, bracket markers, transfer-only, accept-new, last-VM key prompt + auto-prune + Remote-SSH fallback) | M | Security batch |
| 5  |  ✅ done   | #4 Create menu rename + reorder                                   | S    | Trivial, no blockers                   |
| 6  | ✅ done | #9b "Open in Multipass" explorer entry points (folder + cloud-init right-click, SSH cancel redirects to sidebar) | M | Tested on macOS |
| 7  | todo   | #9a Mount workspace (your "great great great!!!")                  | M    | High enthusiasm, standalone            |
| 8  | partial(macos tested only) | #8 Multipass install detection + terminal-first flow              | M    | Tested on macOS only; OS parity remains |
| 9  | todo   | #3 Profile storage in `multipassRun.profiles` settings            | S    | Foundation for #9 (cloud-init save-as) |
| 10 | todo   | #2 Cloud-init UI (validation, templates, save-as-profile)         | L    | Biggest; needs design doc first        |
| 11 | todo   | #9 extras: Snapshots, Clone, Status bar, Logs, Net row, Port fwd  | L    | Backlog, parallel issues               |
| later | —   | Charts, repo-detect quick-launch                                  | —    | Defer past v1                          |

---

## Open questions for you

1. Cloud-init: prefer file-picker, inline editor, or templates as the primary entry point?

> both file picker and inline editor.

**A:** OK. Top-level QuickPick = `Open file…` / `New from template` / `Paste inline`. All three converge on the inline editor view for validation before launch.

2. Profile storage: JSON or YAML? (YAML matches cloud-init ecosystem.)

> json inside the vscode settings file

**A:** Confirmed. `multipassRun.profiles` in settings, JSON, schema-validated via `package.json` `contributes.configuration`.

3. Should soft-delete also remove SSH config, or keep it (so recover restores instantly without re-running `setupSSH`)?

> no

**A:** Keep current behavior. Purge-only cleanup.

4. Auto-install via terminal: opt-in button, or replace current "Open Download Page" entirely?

>not sure

**A:** Recommend: keep both. Primary CTA = `[Install via terminal]` when package manager detected; secondary = `[Open Download Page]`. If no package manager → primary becomes download page. User always has an out.

5. Which OS do you ship 1.0 on first — all three at parity, or Linux-first with Mac/Win catching up?

> parity first, if not macos then linux

**A:** Aim for parity. Code OS-agnostic by default; gate platform-specific only at install detection + key paths. If a feature can't ship parity by 1.0, Mac falls back to Linux behavior.

---

## Next step

Spiking **#1 pending-launch persistence** (item 1 in reordered list) when you say go. Or pick a different starting point.

>
