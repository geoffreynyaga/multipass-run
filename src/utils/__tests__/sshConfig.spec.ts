/**
 * Integration tests for sshConfig.ts.
 *
 * Strategy:
 *  - Real fs on a per-test temp directory ($TMP/mp-ssh-XXXX/.ssh).
 *  - `os.homedir()` is spied to return the temp dir.
 *  - `child_process.exec` and `child_process.execFile` are mocked so we
 *    don't actually invoke ssh-keygen / multipass / ssh.
 *
 * These tests guard the parts that touch the user's filesystem and
 * subprocess boundary — the riskiest surface in the SSH stack.
 */

jest.mock('vscode');
jest.mock('os', () => {
	const actual = jest.requireActual('os');
	return {
		...actual,
		homedir: jest.fn(),
	};
});
jest.mock('child_process', () => {
	const actual = jest.requireActual('child_process');
	return {
		...actual,
		exec: jest.fn(),
		execFile: jest.fn(),
	};
});

import * as cp from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import {
	countManagedSSHEntries,
	removeManagedSSHKeyPair,
	removeSSHConfigForInstance,
	setupSSHForInstance,
} from '../sshConfig';
import {
	BLOCK_BEGIN_PREFIX,
	BLOCK_END_PREFIX,
	countBlocks,
} from '../sshConfigParser';
import { KEY_NAME_ED25519, KEY_NAME_RSA_LEGACY } from '../sshKeyPath';

const execFileMock = cp.execFile as unknown as jest.Mock;
const execMock = cp.exec as unknown as jest.Mock;

interface ExecCall {
	cmd: string;
	args: string[];
}

let tempHome: string;
let sshDir: string;
let sshConfigPath: string;
let execCalls: ExecCall[];
let execFileCalls: ExecCall[];

/**
 * Default mock impl: every command succeeds with empty stdout.
 * Tests can override per-call with `setExecFileImpl`.
 */
function defaultExecFileImpl(...callArgs: unknown[]): unknown {
	const cmd = callArgs[0] as string;
	const args = Array.isArray(callArgs[1]) ? (callArgs[1] as string[]) : [];
	execFileCalls.push({ cmd, args });
	const callback = callArgs[callArgs.length - 1] as (
		err: Error | null,
		result: { stdout: string; stderr: string }
	) => void;

	// ssh-keygen with -f /path → write a fake key pair on disk so the
	// post-keygen fs.readFileSync(public key) succeeds.
	if (cmd === 'ssh-keygen') {
		const fIdx = args.indexOf('-f');
		if (fIdx >= 0 && args[fIdx + 1]) {
			const keyPath = args[fIdx + 1];
			fs.writeFileSync(keyPath, 'PRIVATE-KEY-PLACEHOLDER\n');
			fs.writeFileSync(keyPath + '.pub', 'ssh-ed25519 AAAA-public-key multipass-vscode\n');
		}
	}

	callback(null, { stdout: '', stderr: '' });
	return {} as unknown;
}

function defaultExecImpl(...callArgs: unknown[]): unknown {
	const cmd = callArgs[0] as string;
	execCalls.push({ cmd, args: [] });
	const callback = callArgs[callArgs.length - 1] as (
		err: Error | null,
		result: { stdout: string; stderr: string }
	) => void;
	callback(null, { stdout: '', stderr: '' });
	return {} as unknown;
}

beforeEach(() => {
	tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'mp-ssh-'));
	sshDir = path.join(tempHome, '.ssh');
	sshConfigPath = path.join(sshDir, 'config');
	execCalls = [];
	execFileCalls = [];
	(os.homedir as jest.Mock).mockReturnValue(tempHome);
	execFileMock.mockImplementation(defaultExecFileImpl);
	execMock.mockImplementation(defaultExecImpl);
	jest.spyOn(console, 'log').mockImplementation(() => undefined);
	jest.spyOn(console, 'warn').mockImplementation(() => undefined);
	jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
	jest.restoreAllMocks();
	(os.homedir as jest.Mock).mockReset();
	execFileMock.mockReset();
	execMock.mockReset();
	try {
		fs.rmSync(tempHome, { recursive: true, force: true });
	} catch {
		// best-effort cleanup
	}
});

function readConfig(): string {
	return fs.existsSync(sshConfigPath) ? fs.readFileSync(sshConfigPath, 'utf8') : '';
}

describe('setupSSHForInstance — fresh install', () => {
	test('creates .ssh directory if missing, generates ed25519 key, writes config', async () => {
		const result = await setupSSHForInstance('vm-1', '10.0.0.1');
		expect(result.success).toBe(true);

		// .ssh dir created
		expect(fs.existsSync(sshDir)).toBe(true);

		// ed25519 key files exist (created by mocked ssh-keygen)
		expect(fs.existsSync(path.join(sshDir, KEY_NAME_ED25519))).toBe(true);
		expect(fs.existsSync(path.join(sshDir, `${KEY_NAME_ED25519}.pub`))).toBe(true);

		// config block written with bracket markers and accept-new
		const cfg = readConfig();
		expect(cfg).toContain(`${BLOCK_BEGIN_PREFIX}vm-1`);
		expect(cfg).toContain(`${BLOCK_END_PREFIX}vm-1`);
		expect(cfg).toContain('Host multipass-vm-1');
		expect(cfg).toContain('HostName 10.0.0.1');
		expect(cfg).toContain('StrictHostKeyChecking accept-new');
		expect(cfg).not.toContain('/dev/null');
	});

	test('invokes ssh-keygen with ed25519 args and no shell', async () => {
		await setupSSHForInstance('vm-1', '10.0.0.1');
		const keygenCall = execFileCalls.find((c) => c.cmd === 'ssh-keygen');
		expect(keygenCall).toBeDefined();
		expect(keygenCall!.args).toEqual(
			expect.arrayContaining(['-t', 'ed25519', '-f', path.join(sshDir, KEY_NAME_ED25519), '-N', ''])
		);
		// Defensive: no -b (RSA-only) leaked in
		expect(keygenCall!.args).not.toContain('-b');
	});

	test('does NOT shell-interpolate the public key into a `-c` script', async () => {
		await setupSSHForInstance('vm-1', '10.0.0.1');
		// The key must travel as a separate argv positional, never embedded
		// inside the `sh -c '<script>'` string itself. We inspect every `-c`
		// argument and assert the key bytes aren't inside it.
		const pubKey = 'ssh-ed25519 AAAA-public-key multipass-vscode';
		for (const call of execFileCalls) {
			const dashCIdx = call.args.indexOf('-c');
			if (dashCIdx < 0) {
				continue;
			}
			const script = call.args[dashCIdx + 1];
			expect(script).not.toContain(pubKey);
			expect(script).not.toMatch(/grep -F.*ssh-ed25519/);
		}
	});

	test('installs key via positional shell arg (no transfer, no stdin pipe)', async () => {
		await setupSSHForInstance('vm-1', '10.0.0.1');

		// Old path used `multipass transfer` and an interim stdin-pipe attempt
		// used `spawn`; neither should be in the path now. The key must travel
		// as a positional argv to the guest `sh`, not as a tmp file or stdin.
		const transferCall = execFileCalls.find(
			(c) => /multipass$/.test(c.cmd) && c.args[0] === 'transfer'
		);
		expect(transferCall).toBeUndefined();

		// Find the install call specifically by script content; there are
		// multiple `multipass exec -- sh -c` calls (ensureGuestSSHDir, etc.).
		const installCall = execFileCalls.find(
			(c) =>
				/multipass$/.test(c.cmd) &&
				c.args[0] === 'exec' &&
				c.args[1] === 'vm-1' &&
				(c.args[c.args.indexOf('-c') + 1] ?? '').includes('authorized_keys')
		);
		expect(installCall).toBeDefined();
		const script = installCall!.args[installCall!.args.indexOf('-c') + 1];
		expect(script).toContain('"$1"');
		expect(script).not.toContain('ssh-ed25519');
		// Public key shows up as the LAST positional, never inside the script.
		const last = installCall!.args[installCall!.args.length - 1];
		expect(last).toBe('ssh-ed25519 AAAA-public-key multipass-vscode');
	});

	test('skips key install if the key is already in authorized_keys', async () => {
		const pubKey = 'ssh-ed25519 AAAA-public-key multipass-vscode';
		execFileMock.mockImplementation((...callArgs: unknown[]) => {
			const cmd = callArgs[0] as string;
			const args = Array.isArray(callArgs[1]) ? (callArgs[1] as string[]) : [];
			execFileCalls.push({ cmd, args });
			const callback = callArgs[callArgs.length - 1] as (
				err: Error | null,
				result: { stdout: string; stderr: string }
			) => void;

			// Pre-create key files when ssh-keygen runs.
			if (cmd === 'ssh-keygen') {
				const fIdx = args.indexOf('-f');
				if (fIdx >= 0) {
					fs.writeFileSync(args[fIdx + 1], 'priv\n');
					fs.writeFileSync(args[fIdx + 1] + '.pub', pubKey + '\n');
				}
				callback(null, { stdout: '', stderr: '' });
				return {} as unknown;
			}
			// Pretend authorized_keys already has our key.
			if (
				/multipass$/.test(cmd) &&
				args[0] === 'exec' &&
				args[args.length - 2] === 'cat'
			) {
				callback(null, { stdout: pubKey + '\n', stderr: '' });
				return {} as unknown;
			}
			callback(null, { stdout: '', stderr: '' });
			return {} as unknown;
		});

		await setupSSHForInstance('vm-2', '10.0.0.2');
		const transferCall = execFileCalls.find(
			(c) => /multipass$/.test(c.cmd) && c.args[0] === 'transfer'
		);
		expect(transferCall).toBeUndefined();
	});

	test('reuses existing legacy RSA key pair if present (does not regenerate)', async () => {
		fs.mkdirSync(sshDir, { recursive: true });
		const rsaPriv = path.join(sshDir, KEY_NAME_RSA_LEGACY);
		fs.writeFileSync(rsaPriv, 'EXISTING-RSA-PRIVATE\n');
		fs.writeFileSync(rsaPriv + '.pub', 'ssh-rsa AAAA-existing multipass-vscode\n');

		await setupSSHForInstance('vm-1', '10.0.0.1');

		// ssh-keygen MUST NOT have been called.
		expect(execFileCalls.find((c) => c.cmd === 'ssh-keygen')).toBeUndefined();

		// ed25519 key MUST NOT have been created.
		expect(fs.existsSync(path.join(sshDir, KEY_NAME_ED25519))).toBe(false);

		// Config block MUST point at the RSA key.
		expect(readConfig()).toContain(`IdentityFile ${rsaPriv}`);
	});
});

describe('setupSSHForInstance — config interactions', () => {
	test('migrates legacy block before adding new entry', async () => {
		fs.mkdirSync(sshDir, { recursive: true });
		const legacy = [
			'# Multipass instance: old-vm (managed by multipass-run extension)',
			'Host multipass-old-vm',
			'  HostName 10.0.0.99',
			'  User ubuntu',
			'  IdentityFile ~/.ssh/multipass_id_rsa',
			'  StrictHostKeyChecking no',
			'  UserKnownHostsFile /dev/null',
			'  LogLevel ERROR',
			'',
		].join('\n');
		fs.writeFileSync(sshConfigPath, legacy);

		await setupSSHForInstance('new-vm', '10.0.0.1');

		const cfg = readConfig();
		// Legacy block migrated:
		expect(cfg).toContain(`${BLOCK_BEGIN_PREFIX}old-vm`);
		expect(cfg).toContain(`${BLOCK_END_PREFIX}old-vm`);
		// New block added:
		expect(cfg).toContain(`${BLOCK_BEGIN_PREFIX}new-vm`);
		expect(countBlocks(cfg)).toBe(2);
		// Legacy block body normalized to the hardened options:
		expect(cfg).not.toMatch(/StrictHostKeyChecking\s+no\b/);
		expect(cfg).not.toContain('/dev/null');
	});

	test('rewrites deprecated options inside ALREADY-bracketed blocks (heal partial migrations)', async () => {
		fs.mkdirSync(sshDir, { recursive: true });
		const partiallyMigrated = [
			`${BLOCK_BEGIN_PREFIX}vm-old`,
			'Host multipass-vm-old',
			'  HostName 10.0.0.99',
			'  User ubuntu',
			'  IdentityFile ~/.ssh/multipass_id_rsa',
			'  StrictHostKeyChecking no',
			'  UserKnownHostsFile /dev/null',
			'  LogLevel ERROR',
			`${BLOCK_END_PREFIX}vm-old`,
		].join('\n');
		fs.writeFileSync(sshConfigPath, partiallyMigrated);

		// Trigger a config write by setting up a different VM.
		await setupSSHForInstance('vm-new', '10.0.0.1');

		const cfg = readConfig();
		// Old block kept its bracket markers and content, but options are now hardened.
		expect(cfg).toContain('Host multipass-vm-old');
		expect(cfg).toContain('StrictHostKeyChecking accept-new');
		expect(cfg).not.toMatch(/StrictHostKeyChecking\s+no\b/);
		expect(cfg).not.toContain('/dev/null');
	});

	test('replaces an existing block with the same instance name (idempotent)', async () => {
		await setupSSHForInstance('vm-1', '10.0.0.1');
		await setupSSHForInstance('vm-1', '10.0.0.99');

		const cfg = readConfig();
		expect(countBlocks(cfg)).toBe(1);
		expect(cfg).toContain('HostName 10.0.0.99');
		expect(cfg).not.toContain('HostName 10.0.0.1');
	});

	test('preserves unrelated user entries in the config', async () => {
		fs.mkdirSync(sshDir, { recursive: true });
		fs.writeFileSync(
			sshConfigPath,
			['Host work', '  HostName work.example.com', '  User dev', ''].join('\n')
		);

		await setupSSHForInstance('vm-1', '10.0.0.1');

		const cfg = readConfig();
		expect(cfg).toContain('Host work');
		expect(cfg).toContain('  HostName work.example.com');
		expect(cfg).toContain('  User dev');
		expect(cfg).toContain('Host multipass-vm-1');
	});

	test('writes config file with mode 0600', async () => {
		await setupSSHForInstance('vm-1', '10.0.0.1');
		if (process.platform === 'win32') {
			// Windows ignores POSIX bits — skip the perms assertion.
			return;
		}
		const stat = fs.statSync(sshConfigPath);
		expect(stat.mode & 0o777).toBe(0o600);
	});

	test('returns success: false when ssh-keygen fails (no partial config write)', async () => {
		execFileMock.mockImplementation((...callArgs: unknown[]) => {
			const cmd = callArgs[0] as string;
			const args = Array.isArray(callArgs[1]) ? (callArgs[1] as string[]) : [];
			execFileCalls.push({ cmd, args });
			const callback = callArgs[callArgs.length - 1] as (
				err: Error | null,
				result: { stdout: string; stderr: string }
			) => void;
			if (cmd === 'ssh-keygen') {
				callback(new Error('ssh-keygen exploded'), { stdout: '', stderr: '' });
				return {} as unknown;
			}
			callback(null, { stdout: '', stderr: '' });
			return {} as unknown;
		});

		const result = await setupSSHForInstance('vm-1', '10.0.0.1');
		expect(result.success).toBe(false);
		expect(result.error).toContain('ssh-keygen');
		// No config block should exist for vm-1.
		expect(readConfig()).not.toContain('vm-1');
	});
});

describe('removeSSHConfigForInstance', () => {
	test('removes the bracketed block for the instance', async () => {
		await setupSSHForInstance('vm-1', '10.0.0.1');
		await setupSSHForInstance('vm-2', '10.0.0.2');
		expect(countBlocks(readConfig())).toBe(2);

		await removeSSHConfigForInstance('vm-1');

		const cfg = readConfig();
		expect(cfg).not.toContain('vm-1');
		expect(cfg).toContain('Host multipass-vm-2');
		expect(countBlocks(cfg)).toBe(1);
	});

	test('calls ssh-keygen -R multipass-<name> to scrub known_hosts', async () => {
		await setupSSHForInstance('vm-1', '10.0.0.1');
		execFileCalls.length = 0; // reset

		await removeSSHConfigForInstance('vm-1');

		const keygenR = execFileCalls.find(
			(c) => c.cmd === 'ssh-keygen' && c.args[0] === '-R' && c.args[1] === 'multipass-vm-1'
		);
		expect(keygenR).toBeDefined();
	});

	test('idempotent: safe to call when config does not exist', async () => {
		expect(fs.existsSync(sshConfigPath)).toBe(false);
		await expect(removeSSHConfigForInstance('ghost')).resolves.toBeUndefined();
		// Still calls ssh-keygen -R as best-effort cleanup.
		const keygenR = execFileCalls.find((c) => c.cmd === 'ssh-keygen' && c.args[0] === '-R');
		expect(keygenR).toBeDefined();
	});

	test('survives manual scribbles inside the bracketed block', async () => {
		fs.mkdirSync(sshDir, { recursive: true });
		const tampered = [
			'Host other',
			'  HostName other.tld',
			'',
			`${BLOCK_BEGIN_PREFIX}vm-1`,
			'# user wrote a note here',
			'Host multipass-vm-1',
			'  HostName 10.0.0.1',
			'  ServerAliveInterval 60',
			`${BLOCK_END_PREFIX}vm-1`,
		].join('\n');
		fs.writeFileSync(sshConfigPath, tampered);

		await removeSSHConfigForInstance('vm-1');

		const cfg = readConfig();
		expect(cfg).not.toContain('multipass-vm-1');
		expect(cfg).not.toContain('user wrote a note');
		expect(cfg).toContain('Host other');
	});

	test('migrates legacy block on the way through (so subsequent calls see brackets)', async () => {
		fs.mkdirSync(sshDir, { recursive: true });
		const legacy = [
			'# Multipass instance: legacy-vm (managed by multipass-run extension)',
			'Host multipass-legacy-vm',
			'  HostName 10.0.0.99',
		].join('\n');
		fs.writeFileSync(sshConfigPath, legacy);

		await removeSSHConfigForInstance('legacy-vm');
		expect(readConfig()).not.toContain('legacy-vm');
		expect(readConfig()).not.toContain('# Multipass instance:');
	});

	test('does not touch unrelated host entries', async () => {
		fs.mkdirSync(sshDir, { recursive: true });
		fs.writeFileSync(
			sshConfigPath,
			['Host work', '  HostName work.tld', '  User dev'].join('\n') + '\n'
		);

		await setupSSHForInstance('vm-1', '10.0.0.1');
		await removeSSHConfigForInstance('vm-1');

		const cfg = readConfig();
		expect(cfg).toContain('Host work');
		expect(cfg).toContain('  HostName work.tld');
		expect(cfg).toContain('  User dev');
	});
});

describe('countManagedSSHEntries', () => {
	test('returns 0 when ssh config does not exist', () => {
		expect(countManagedSSHEntries()).toBe(0);
	});

	test('returns 0 for a config without managed blocks', () => {
		fs.mkdirSync(sshDir, { recursive: true });
		fs.writeFileSync(sshConfigPath, 'Host work\n  HostName work.tld\n');
		expect(countManagedSSHEntries()).toBe(0);
	});

	test('reflects added and removed entries', async () => {
		expect(countManagedSSHEntries()).toBe(0);
		await setupSSHForInstance('vm-1', '10.0.0.1');
		expect(countManagedSSHEntries()).toBe(1);
		await setupSSHForInstance('vm-2', '10.0.0.2');
		expect(countManagedSSHEntries()).toBe(2);
		await removeSSHConfigForInstance('vm-1');
		expect(countManagedSSHEntries()).toBe(1);
		await removeSSHConfigForInstance('vm-2');
		expect(countManagedSSHEntries()).toBe(0);
	});
});

describe('removeManagedSSHKeyPair', () => {
	test('deletes ed25519 key pair if present', () => {
		fs.mkdirSync(sshDir, { recursive: true });
		const ed = path.join(sshDir, KEY_NAME_ED25519);
		fs.writeFileSync(ed, 'priv\n');
		fs.writeFileSync(ed + '.pub', 'pub\n');

		removeManagedSSHKeyPair();

		expect(fs.existsSync(ed)).toBe(false);
		expect(fs.existsSync(ed + '.pub')).toBe(false);
	});

	test('deletes legacy RSA key pair if present', () => {
		fs.mkdirSync(sshDir, { recursive: true });
		const rsa = path.join(sshDir, KEY_NAME_RSA_LEGACY);
		fs.writeFileSync(rsa, 'priv\n');
		fs.writeFileSync(rsa + '.pub', 'pub\n');

		removeManagedSSHKeyPair();

		expect(fs.existsSync(rsa)).toBe(false);
		expect(fs.existsSync(rsa + '.pub')).toBe(false);
	});

	test('deletes both key pairs if both exist', () => {
		fs.mkdirSync(sshDir, { recursive: true });
		const ed = path.join(sshDir, KEY_NAME_ED25519);
		const rsa = path.join(sshDir, KEY_NAME_RSA_LEGACY);
		for (const p of [ed, rsa]) {
			fs.writeFileSync(p, 'priv\n');
			fs.writeFileSync(p + '.pub', 'pub\n');
		}

		removeManagedSSHKeyPair();

		for (const p of [ed, rsa]) {
			expect(fs.existsSync(p)).toBe(false);
			expect(fs.existsSync(p + '.pub')).toBe(false);
		}
	});

	test('is a silent no-op when no key pairs exist', () => {
		expect(() => removeManagedSSHKeyPair()).not.toThrow();
	});

	test('does not delete unrelated files in ~/.ssh', () => {
		fs.mkdirSync(sshDir, { recursive: true });
		const config = path.join(sshDir, 'config');
		const knownHosts = path.join(sshDir, 'known_hosts');
		const otherKey = path.join(sshDir, 'id_ed25519'); // user's personal key
		fs.writeFileSync(config, '# user config');
		fs.writeFileSync(knownHosts, '# user known_hosts');
		fs.writeFileSync(otherKey, 'user-private-key');
		fs.writeFileSync(otherKey + '.pub', 'user-public-key');

		removeManagedSSHKeyPair();

		expect(fs.existsSync(config)).toBe(true);
		expect(fs.existsSync(knownHosts)).toBe(true);
		expect(fs.existsSync(otherKey)).toBe(true);
		expect(fs.existsSync(otherKey + '.pub')).toBe(true);
	});
});
