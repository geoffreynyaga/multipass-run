import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';

import { exec, execFile } from 'child_process';
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
	type KeyPaths,
	keygenArgs,
	resolveKeyPaths,
} from './sshKeyPath';

import { MULTIPASS_PATHS } from './constants';
import { promisify } from 'util';

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

export interface SSHSetupResult {
	success: boolean;
	error?: string;
}

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
async function findMultipassPath(): Promise<string> {
	let lastError: unknown = null;
	for (const mp of MULTIPASS_PATHS) {
		try {
			await execAsync(`${mp} version`);
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
		await execFileAsync('ssh-keygen', keygenArgs(paths.type, paths.privateKey));
		fs.chmodSync(paths.privateKey, 0o600);
		fs.chmodSync(paths.publicKey, 0o644);
	}
	return paths;
}

async function ensureGuestSSHDir(multipassPath: string, instanceName: string): Promise<void> {
	await execFileAsync(multipassPath, [
		'exec',
		instanceName,
		'--',
		'sh',
		'-c',
		'mkdir -p ~/.ssh && chmod 700 ~/.ssh',
	]);
}

async function readGuestAuthorizedKeys(multipassPath: string, instanceName: string): Promise<string> {
	try {
		const { stdout } = await execFileAsync(multipassPath, [
			'exec',
			instanceName,
			'--',
			'cat',
			'/home/ubuntu/.ssh/authorized_keys',
		]);
		return stdout;
	} catch {
		return '';
	}
}

async function appendKeyToGuest(
	multipassPath: string,
	instanceName: string,
	publicKey: string
): Promise<void> {
	const tmpFile = path.join(os.tmpdir(), `multipass_key_${Date.now()}_${process.pid}.pub`);
	fs.writeFileSync(tmpFile, publicKey + '\n', { mode: 0o644 });
	try {
		await execFileAsync(multipassPath, ['transfer', tmpFile, `${instanceName}:/tmp/mp_authkey.pub`]);
		await execFileAsync(multipassPath, [
			'exec',
			instanceName,
			'--',
			'sh',
			'-c',
			'touch ~/.ssh/authorized_keys && cat /tmp/mp_authkey.pub >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && rm -f /tmp/mp_authkey.pub',
		]);
	} finally {
		try {
			fs.unlinkSync(tmpFile);
		} catch {
			// ignore
		}
	}
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
	instanceIP: string
): Promise<SSHSetupResult> {
	try {
		const keys = await ensureSSHKeyPair();
		const publicKey = fs.readFileSync(keys.publicKey, 'utf8').trim();

		const multipassPath = await findMultipassPath();
		await ensureGuestSSHDir(multipassPath, instanceName);

		const existing = await readGuestAuthorizedKeys(multipassPath, instanceName);
		if (!existing.includes(publicKey)) {
			await appendKeyToGuest(multipassPath, instanceName, publicKey);
			console.log(`SSH key added to instance '${instanceName}' (${keys.type})`);
		} else {
			console.log(`SSH key already present in instance '${instanceName}'`);
		}

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
		try {
			await execAsync(
				`ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new -i "${keys.privateKey}" ubuntu@${instanceIP} "echo ok"`
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
