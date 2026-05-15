import { exec, execFile } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { promisify } from 'util';
import * as vscode from 'vscode';

import {
	SSH_GUEST_EXEC_TIMEOUT_MS,
	SSH_KEYGEN_TIMEOUT_MS,
	SSH_MULTIPASS_VERSION_TIMEOUT_MS,
	SSH_PROBE_TIMEOUT_MS,
} from '../config/timings';
import { MULTIPASS_PATHS } from './constants';
import {
	addBlock,
	buildHostBody,
	countBlocks,
	extractBlocks,
	migrateLegacyBlocks,
	normalizeManagedBlockBodies,
	removeBlock,
} from './sshConfigParser';
import {
	KEY_NAME_ED25519,
	KEY_NAME_RSA_LEGACY,
	keygenArgs,
	type KeyPaths,
	resolveKeyPaths,
} from './sshKeyPath';

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

export interface SSHSetupResult {
	success: boolean;
	error?: string;
}

/** Step labels for the progress reporter — used both for the toast and to
 * pinpoint which call hung when a step times out. */
export type SSHSetupStep =
	| 'keypair'
	| 'multipass'
	| 'guest-dir'
	| 'read-keys'
	| 'install-key'
	| 'write-config'
	| 'probe';

export type SSHSetupStepReporter = (step: SSHSetupStep) => void;

function sshDir(): string {
	return path.join(os.homedir(), '.ssh');
}

function sshConfigPath(): string {
	return path.join(sshDir(), 'config');
}

/**
 * Resolves the multipass binary by running `<candidate> version` through a
 * shell (which performs PATH lookup) and taking the first one that succeeds.
 * Mirrors the loop pattern used elsewhere in the codebase so we behave the
 * same way as `multipass list` and friends.
 */
// Child_process timeouts only fire SIGTERM at the process; on a hung
// `multipass exec` that's enough to unblock us. Promisified `exec`/`execFile`
// reject with a TimedOut-like error in that case. We rewrap so the error
// names the step instead of saying "Command failed", and surface the captured
// stderr so the user sees the actual cause (e.g. why `multipass transfer`
// rejected the destination path).
interface ExecError extends Error {
	stderr?: string | Buffer;
	stdout?: string | Buffer;
	killed?: boolean;
	signal?: NodeJS.Signals | null;
	code?: number | string | null;
}

function describeExecError(err: ExecError, label: string, timeoutMs: number): Error {
	// Node's child_process timeout fires SIGTERM at the child; that's what
	// distinguishes "we killed it" from "it exited non-zero on its own".
	if (err.killed === true && err.signal === 'SIGTERM') {
		return new Error(`${label} timed out after ${Math.round(timeoutMs / 1000)} s`);
	}
	const stderr = (err.stderr ?? '').toString().trim();
	const detail = stderr.length > 0
		? stderr.length > 400 ? stderr.slice(0, 400) + '…' : stderr
		: err.message ?? String(err);
	return new Error(`${label}: ${detail}`);
}

function withStepLabel<T>(promise: Promise<T>, label: string, timeoutMs: number): Promise<T> {
	return promise.catch((err: unknown) => {
		if (err instanceof Error) {
			throw describeExecError(err as ExecError, label, timeoutMs);
		}
		throw new Error(`${label}: ${String(err)}`);
	});
}

async function findMultipassPath(): Promise<string> {
	let lastError: unknown = null;
	for (const mp of MULTIPASS_PATHS) {
		try {
			await withStepLabel(
				execAsync(`${mp} version`, { timeout: SSH_MULTIPASS_VERSION_TIMEOUT_MS }),
				`multipass version (${mp})`,
				SSH_MULTIPASS_VERSION_TIMEOUT_MS
			);
			return mp;
		} catch (err) {
			lastError = err;
			continue;
		}
	}
	const message = lastError instanceof Error ? lastError.message : 'unknown error';
	throw new Error(
		`Multipass command not found (last error: ${message}). ` +
			`Try restarting VS Code from a terminal so the shell PATH is inherited.`
	);
}

async function ensureSSHKeyPair(): Promise<KeyPaths> {
	const dir = sshDir();
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { mode: 0o700 });
	}
	const paths = resolveKeyPaths(dir, fs.existsSync);
	if (!fs.existsSync(paths.privateKey)) {
		await withStepLabel(
			execFileAsync('ssh-keygen', keygenArgs(paths.type, paths.privateKey), {
				timeout: SSH_KEYGEN_TIMEOUT_MS,
			}),
			'ssh-keygen',
			SSH_KEYGEN_TIMEOUT_MS
		);
		fs.chmodSync(paths.privateKey, 0o600);
		fs.chmodSync(paths.publicKey, 0o644);
	}
	return paths;
}

async function ensureGuestSSHDir(multipassPath: string, instanceName: string): Promise<void> {
	await withStepLabel(
		execFileAsync(
			multipassPath,
			['exec', instanceName, '--', 'sh', '-c', 'mkdir -p ~/.ssh && chmod 700 ~/.ssh'],
			{ timeout: SSH_GUEST_EXEC_TIMEOUT_MS }
		),
		`multipass exec mkdir ~/.ssh on ${instanceName}`,
		SSH_GUEST_EXEC_TIMEOUT_MS
	);
}

async function readGuestAuthorizedKeys(multipassPath: string, instanceName: string): Promise<string> {
	try {
		const { stdout } = await withStepLabel(
			execFileAsync(
				multipassPath,
				['exec', instanceName, '--', 'cat', '/home/ubuntu/.ssh/authorized_keys'],
				{ timeout: SSH_GUEST_EXEC_TIMEOUT_MS }
			),
			`multipass exec cat authorized_keys on ${instanceName}`,
			SSH_GUEST_EXEC_TIMEOUT_MS
		);
		return stdout;
	} catch {
		// Missing file is the common case; the install step will create it.
		return '';
	}
}

// Pass the public key as a positional shell argument ($1) rather than piping
// over stdin. Two reasons:
//   * Some multipass builds don't forward host stdin through to the guest
//     process — `tee` then waits forever for EOF and our 30 s cap kills it.
//   * Positional args are NOT shell-interpolated by the inner `sh`, so the
//     key bytes can never be parsed as shell metacharacters even though
//     ed25519 keys can contain `/` and `+`. Safer than `bash -c "...$KEY..."`.
// The argv list still passes through `execFile`, which never invokes a host
// shell, so there's no host-side interpolation either.
async function appendKeyToGuest(
	multipassPath: string,
	instanceName: string,
	publicKey: string
): Promise<void> {
	await withStepLabel(
		execFileAsync(
			multipassPath,
			[
				'exec',
				instanceName,
				'--',
				'sh',
				'-c',
				'mkdir -p ~/.ssh && chmod 700 ~/.ssh && printf "%s\\n" "$1" >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys',
				'_',
				publicKey,
			],
			{ timeout: SSH_GUEST_EXEC_TIMEOUT_MS }
		),
		`multipass exec install authorized_keys on ${instanceName}`,
		SSH_GUEST_EXEC_TIMEOUT_MS
	);
}

/**
 * Sets up SSH access for a Multipass instance and adds it to SSH config.
 *
 * Hardening notes:
 *  - Uses ed25519 by default; keeps existing RSA pair if user already has one.
 *  - Uses `multipass transfer` + `sh -c` (no shell interpolation of the public
 *    key) to install the key in the guest authorized_keys.
 *  - Writes a bracketed config block so removal is robust against manual edits.
 *  - Uses `StrictHostKeyChecking accept-new` and the standard known_hosts file
 *    so subsequent connections detect host-key tampering.
 */
export async function setupSSHForInstance(
	instanceName: string,
	instanceIP: string,
	onStep?: SSHSetupStepReporter
): Promise<SSHSetupResult> {
	try {
		onStep?.('keypair');
		const keys = await ensureSSHKeyPair();
		const publicKey = fs.readFileSync(keys.publicKey, 'utf8').trim();

		onStep?.('multipass');
		const multipassPath = await findMultipassPath();

		onStep?.('guest-dir');
		await ensureGuestSSHDir(multipassPath, instanceName);

		onStep?.('read-keys');
		const existing = await readGuestAuthorizedKeys(multipassPath, instanceName);
		if (!existing.includes(publicKey)) {
			onStep?.('install-key');
			await appendKeyToGuest(multipassPath, instanceName, publicKey);
			console.log(`SSH key added to instance '${instanceName}' (${keys.type})`);
		} else {
			console.log(`SSH key already present in instance '${instanceName}'`);
		}

		onStep?.('write-config');
		const sshHostName = `multipass-${instanceName}`;
		const body = buildHostBody({
			hostAlias: sshHostName,
			hostName: instanceIP,
			identityFile: keys.privateKey,
		});

		const cfgPath = sshConfigPath();
		let cfg = fs.existsSync(cfgPath) ? fs.readFileSync(cfgPath, 'utf8') : '';
		cfg = normalizeManagedBlockBodies(migrateLegacyBlocks(cfg));
		cfg = addBlock(cfg, instanceName, body);
		fs.writeFileSync(cfgPath, cfg, { mode: 0o600 });

		console.log(`SSH config entry written for '${instanceName}' as '${sshHostName}' -> ${instanceIP}`);

		// Best-effort connection probe. Don't fail setup on this — accept-new
		// will record the host key on the user's first real connection anyway.
		// ConnectTimeout alone isn't enough: a half-open sshd can hang the
		// channel forever, so we also cap the whole child via Node-side timeout.
		onStep?.('probe');
		try {
			await execFileAsync(
				'ssh',
				[
					'-o', `ConnectTimeout=${Math.round(SSH_PROBE_TIMEOUT_MS / 1000)}`,
					'-o', 'StrictHostKeyChecking=accept-new',
					'-o', 'BatchMode=yes',
					'-i', keys.privateKey,
					`ubuntu@${instanceIP}`,
					'echo ok',
				],
				{ timeout: SSH_PROBE_TIMEOUT_MS }
			);
		} catch (err: unknown) {
			console.warn('SSH connection probe failed (non-fatal):', err);
		}

		return { success: true };
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : 'Unknown error during SSH setup';
		console.error(`SSH setup error: ${message}`);
		return { success: false, error: message };
	}
}

/**
 * Removes the bracketed SSH config block for the instance and best-effort
 * scrubs the known_hosts entry. Idempotent: safe to call when the entry is
 * already gone.
 */
export async function removeSSHConfigForInstance(instanceName: string): Promise<void> {
	try {
		const cfgPath = sshConfigPath();
		if (fs.existsSync(cfgPath)) {
			let cfg = fs.readFileSync(cfgPath, 'utf8');
			cfg = normalizeManagedBlockBodies(migrateLegacyBlocks(cfg));
			cfg = removeBlock(cfg, instanceName);
			fs.writeFileSync(cfgPath, cfg, { mode: 0o600 });
		}
	} catch (error) {
		console.error('Error removing SSH config entry:', error);
	}

	const sshHostName = `multipass-${instanceName}`;
	try {
		await execFileAsync('ssh-keygen', ['-R', sshHostName]);
	} catch (error) {
		// Host may not be in known_hosts; ignore.
		console.log(`ssh-keygen -R ${sshHostName} returned non-zero (ok if absent)`);
	}
}

/**
 * Returns the number of bracket-managed multipass-run blocks currently in
 * `~/.ssh/config`. Used to drive the "no more instances — remove key?" prompt
 * after the last purge.
 */
export function countManagedSSHEntries(): number {
	const cfgPath = sshConfigPath();
	if (!fs.existsSync(cfgPath)) {
		return 0;
	}
	const cfg = fs.readFileSync(cfgPath, 'utf8');
	return countBlocks(cfg);
}

/**
 * Removes managed SSH config blocks whose instance names are NOT present in
 * the supplied set. Used to scrub stale entries left behind by VMs deleted
 * outside the extension (e.g. via `multipass delete --purge`).
 *
 * Returns the names of blocks that were removed.
 */
export async function pruneOrphanedSSHEntries(
	knownInstanceNames: ReadonlySet<string>
): Promise<string[]> {
	const removed: string[] = [];
	const cfgPath = sshConfigPath();
	if (!fs.existsSync(cfgPath)) {
		return removed;
	}

	let cfg = fs.readFileSync(cfgPath, 'utf8');
	cfg = normalizeManagedBlockBodies(migrateLegacyBlocks(cfg));

	const orphans = extractBlocks(cfg)
		.map((b) => b.instanceName)
		.filter((name) => !knownInstanceNames.has(name));

	for (const name of orphans) {
		cfg = removeBlock(cfg, name);
		removed.push(name);
	}

	fs.writeFileSync(cfgPath, cfg, { mode: 0o600 });

	for (const name of removed) {
		try {
			await execFileAsync('ssh-keygen', ['-R', `multipass-${name}`]);
		} catch {
			// Host may not be in known_hosts; ignore.
		}
	}

	return removed;
}

/**
 * Returns true when at least one of the multipass-managed SSH key files
 * still exists on disk. The last-instance purge prompt uses this to skip
 * asking the user about a key pair that was never created in the first
 * place (e.g. they only ever launched VMs with SSH disabled).
 */
export function hasManagedSSHKeyPair(): boolean {
	const dir = sshDir();
	for (const baseName of [KEY_NAME_ED25519, KEY_NAME_RSA_LEGACY]) {
		const priv = path.join(dir, baseName);
		if (fs.existsSync(priv) || fs.existsSync(`${priv}.pub`)) {
			return true;
		}
	}
	return false;
}

/**
 * Deletes both the ed25519 and the legacy RSA key pair if either exists.
 * Used by the last-instance purge prompt.
 */
export function removeManagedSSHKeyPair(): void {
	const dir = sshDir();
	for (const baseName of [KEY_NAME_ED25519, KEY_NAME_RSA_LEGACY]) {
		const priv = path.join(dir, baseName);
		const pub = `${priv}.pub`;
		if (fs.existsSync(priv)) {
			try {
				fs.unlinkSync(priv);
			} catch (err) {
				console.warn(`Failed to delete ${priv}:`, err);
			}
		}
		if (fs.existsSync(pub)) {
			try {
				fs.unlinkSync(pub);
			} catch (err) {
				console.warn(`Failed to delete ${pub}:`, err);
			}
		}
	}
}

/**
 * Opens (or focuses) VS Code's Remote Explorer view. Tries modern command
 * ids first, falls back to the legacy `opensshremotes.focus` for older
 * Remote-SSH builds, then surfaces a nudge if nothing is registered.
 */
export async function openRemoteSSHView(): Promise<void> {
	const candidates = [
		'workbench.view.remote',
		'remote-explorer.focus',
		'opensshremotes.focus',
	];
	for (const cmd of candidates) {
		try {
			await vscode.commands.executeCommand(cmd);
			return;
		} catch {
			continue;
		}
	}
	vscode.window.showInformationMessage(
		'Open the Remote Explorer panel manually (View → Open View… → Remote Explorer) and pick the SSH host.'
	);
}

/**
 * Opens an instance in VS Code Remote SSH
 */
export async function connectToInstanceViaSSH(instanceName: string): Promise<void> {
	const sshHostName = `multipass-${instanceName}`;

	try {
		console.log(`Attempting to connect to SSH host: ${sshHostName}`);

		// First, reload the SSH config to make sure Remote-SSH sees our changes
		try {
			await vscode.commands.executeCommand('remote-ssh.configureHostsFile');
			console.log('Triggered SSH config reload');
			// Give it a moment to process
			await new Promise((resolve) => setTimeout(resolve, 500));
		} catch (reloadError) {
			console.warn('Could not reload SSH config:', reloadError);
			// Continue anyway
		}

		// Try to connect using Remote-SSH: Connect to Host command
		// This opens a new window connected to the host
		await vscode.commands.executeCommand('remote-ssh.connectToHost', sshHostName);
		console.log('Successfully triggered remote-ssh.connectToHost command');
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		console.error(`remote-ssh.connectToHost failed: ${message}`);

		// Fallback: try opening with SSH URI in a new window
		try {
			console.log('Trying fallback: vscode.openFolder with SSH URI');
			await vscode.commands.executeCommand(
				'vscode.openFolder',
				vscode.Uri.parse(`vscode-remote://ssh-remote+${sshHostName}/home/ubuntu`),
				{ forceNewWindow: true }
			);
			console.log('Successfully opened SSH connection with URI');
		} catch (uriError: unknown) {
			const uriMessage = uriError instanceof Error ? uriError.message : String(uriError);
			console.error(`SSH URI connection failed: ${uriMessage}`);

			// Final fallback: try using the Remote Explorer command
			try {
				console.log('Trying final fallback: remote.newWindow');
				await vscode.commands.executeCommand('remote.newWindow', {
					authority: `ssh-remote+${sshHostName}`,
				});
			} catch (fallbackError: unknown) {
				const fallbackMessage =
					fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
				console.error(`All connection attempts failed: ${fallbackMessage}`);
				vscode.window.showErrorMessage(
					`Failed to connect via Remote-SSH: ${message}\n\nPlease try connecting manually from the Remote-SSH extension panel using host: ${sshHostName}`
				);
			}
		}
	}
}
