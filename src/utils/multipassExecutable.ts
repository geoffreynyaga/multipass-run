import * as fs from 'fs';

import { exec, execFile, spawn, type ChildProcessWithoutNullStreams } from 'child_process';

import { MULTIPASS_PATHS } from './constants';
import { promisify } from 'util';

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

/**
 * Removes SNAP-related variables inherited from a snapped VS Code process.
 * Multipass needs its own snap context rather than the editor's.
 */
export function getSnapCleanEnv(): NodeJS.ProcessEnv {
	const env: NodeJS.ProcessEnv = { ...process.env };
	for (const key of Object.keys(env)) {
		if (key.startsWith('SNAP')) {
			delete env[key];
		}
	}
	return env;
}

let cachedPath: string | null = null;

/**
 * Pure resolver: pick the first path on the user's disk, falling back to a
 * bare command name that depends on PATH being set at exec time.
 *
 * Exposed for unit testing — production callers should use
 * `findMultipassExecutable` which adds a `which`-based discovery step.
 */
export function pickMultipassFromDisk(
	candidates: readonly string[],
	existsOnDisk: (p: string) => boolean
): string | null {
	for (const candidate of candidates) {
		if (candidate === 'multipass') {
			continue;
		}
		try {
			if (existsOnDisk(candidate)) {
				return candidate;
			}
		} catch {
			// Broken symlinks or permission errors fall through.
		}
	}
	return null;
}

/**
 * Resolves the multipass binary in this order:
 *  1. The first path in MULTIPASS_PATHS that exists on disk.
 *  2. A login-shell `which multipass` lookup (picks up Homebrew etc when
 *     VS Code was launched from Spotlight without an inherited PATH).
 *  3. The bare command `multipass` (relies on PATH at exec time).
 *
 * Result is cached in-process. Call `resetMultipassExecutableCache()` after
 * an install/uninstall to force re-discovery.
 */
export async function findMultipassExecutable(): Promise<string> {
	if (cachedPath) {
		return cachedPath;
	}
	const onDisk = pickMultipassFromDisk(MULTIPASS_PATHS, fs.existsSync);
	if (onDisk) {
		cachedPath = onDisk;
		return onDisk;
	}

	for (const shellCmd of [
		`/bin/zsh -lc 'command -v multipass'`,
		`/bin/bash -lc 'command -v multipass'`,
		`/bin/sh -c 'command -v multipass'`,
	]) {
		try {
			const { stdout } = await execAsync(shellCmd, { env: getSnapCleanEnv() });
			const trimmed = stdout.trim().split('\n')[0];
			if (trimmed && fs.existsSync(trimmed)) {
				cachedPath = trimmed;
				return trimmed;
			}
		} catch {
			// Shell missing on this platform; fall through.
		}
	}

	cachedPath = 'multipass';
	return cachedPath;
}

export function resetMultipassExecutableCache(): void {
	cachedPath = null;
}

function isSnapMultipassPath(executablePath: string): boolean {
	return process.platform === 'linux' && executablePath === '/snap/bin/multipass';
}

function shellEscape(arg: string): string {
	return `'${arg.replace(/'/g, `'"'"'`)}'`;
}

function buildScriptCommand(executablePath: string, args: readonly string[]): string {
	return [executablePath, ...args].map(shellEscape).join(' ');
}

export async function runMultipassCommand(args: readonly string[]): Promise<{ stdout: string; stderr: string }> {
	const multipassPath = await findMultipassExecutable();
	const env = getSnapCleanEnv();
	const directResult = await execFileAsync(multipassPath, [...args], { env });

	if (directResult.stdout || !isSnapMultipassPath(multipassPath)) {
		return directResult;
	}

	return execFileAsync('script', ['-q', '-c', buildScriptCommand(multipassPath, args), '/dev/null'], {
		env,
	});
}

export async function spawnMultipassCommand(args: readonly string[]): Promise<ChildProcessWithoutNullStreams> {
	const multipassPath = await findMultipassExecutable();
	const env = getSnapCleanEnv();

	if (isSnapMultipassPath(multipassPath)) {
		return spawn('script', ['-q', '-c', buildScriptCommand(multipassPath, args), '/dev/null'], { env });
	}

	return spawn(multipassPath, [...args], { env });
}
