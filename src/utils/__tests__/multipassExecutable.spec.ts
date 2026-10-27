jest.mock('child_process', () => {
	const actual = jest.requireActual('child_process');
	return {
		...actual,
		exec: jest.fn(),
		execFile: jest.fn(),
	};
});

jest.mock('fs', () => {
	const actual = jest.requireActual('fs');
	return {
		...actual,
		existsSync: jest.fn(() => false),
	};
});

import * as cp from 'child_process';
import * as fs from 'fs';

import {
	pickMultipassFromDisk,
	resetMultipassExecutableCache,
	runMultipassAction,
	runMultipassCommand,
} from '../multipassExecutable';

const execFileMock = cp.execFile as unknown as jest.Mock;
const existsSyncMock = fs.existsSync as unknown as jest.Mock;

beforeEach(() => {
	jest.restoreAllMocks();
	resetMultipassExecutableCache();
	execFileMock.mockReset();
	existsSyncMock.mockReset();
});

describe('pickMultipassFromDisk', () => {
	const candidates = [
		'multipass',
		'/snap/bin/multipass',
		'/usr/local/bin/multipass',
		'/opt/homebrew/bin/multipass',
		'/Library/Application Support/com.canonical.multipass/bin/multipass',
		'C:\\Program Files\\Multipass\\bin\\multipass.exe',
	];

	test('returns null when no candidate exists on disk', () => {
		expect(pickMultipassFromDisk(candidates, () => false)).toBeNull();
	});

	test('skips the bare "multipass" PATH entry (cannot test on disk)', () => {
		expect(pickMultipassFromDisk(['multipass'], () => true)).toBeNull();
	});

	test('returns the first absolute path that exists', () => {
		const onDisk = new Set(['/usr/local/bin/multipass', '/opt/homebrew/bin/multipass']);
		expect(pickMultipassFromDisk(candidates, (p) => onDisk.has(p))).toBe('/usr/local/bin/multipass');
	});

	test('respects the candidate ordering — first hit wins', () => {
		const onDisk = new Set(['/opt/homebrew/bin/multipass']);
		expect(pickMultipassFromDisk(candidates, (p) => onDisk.has(p))).toBe('/opt/homebrew/bin/multipass');
	});

	test('tolerates exists() throwing on broken symlinks', () => {
		const onDisk = new Set(['/usr/local/bin/multipass']);
		const exists = (p: string): boolean => {
			if (p === '/snap/bin/multipass') {
				throw new Error('EACCES');
			}
			return onDisk.has(p);
		};
		expect(pickMultipassFromDisk(candidates, exists)).toBe('/usr/local/bin/multipass');
	});

	test('returns null when only the bare PATH entry "matches"', () => {
		// Even if exists() lies, the bare name is skipped.
		expect(pickMultipassFromDisk(['multipass'], () => true)).toBeNull();
	});

	test('returns the macOS pkg installer canonical path when nothing else exists', () => {
		const macPath = '/Library/Application Support/com.canonical.multipass/bin/multipass';
		expect(pickMultipassFromDisk(candidates, (p) => p === macPath)).toBe(macPath);
	});
});

describe('runMultipassCommand', () => {
	test('falls back to script when snap multipass returns empty stdout', async () => {
		// The snap script-wrapper only triggers for /snap/bin/multipass on
		// Linux, so pin both the platform and the on-disk binary; otherwise the
		// resolver picks up a real /usr/local/bin/multipass and/or a non-Linux
		// host disables the fallback, and the test only passes on Linux CI.
		const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
		Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
		existsSyncMock.mockImplementation((p: string) => p === '/snap/bin/multipass');

		try {
			execFileMock
				.mockImplementationOnce((...callArgs: unknown[]) => {
					const callback = callArgs[callArgs.length - 1] as (
						err: Error | null,
						result: { stdout: string; stderr: string }
					) => void;
					callback(null, { stdout: '', stderr: '' });
					return {} as unknown;
				})
				.mockImplementationOnce((...callArgs: unknown[]) => {
					const callback = callArgs[callArgs.length - 1] as (
						err: Error | null,
						result: { stdout: string; stderr: string }
					) => void;
					callback(null, { stdout: '{"list":[]}', stderr: '' });
					return {} as unknown;
				});

			const result = await runMultipassCommand(['list', '--format', 'json']);

			expect(execFileMock).toHaveBeenNthCalledWith(
				1,
				'/snap/bin/multipass',
				['list', '--format', 'json'],
				expect.objectContaining({ env: expect.any(Object) }),
				expect.any(Function)
			);
			expect(execFileMock).toHaveBeenNthCalledWith(
				2,
				'script',
				['-q', '-c', "'/snap/bin/multipass' 'list' '--format' 'json'", '/dev/null'],
				expect.objectContaining({ env: expect.any(Object) }),
				expect.any(Function)
			);
			expect(result.stdout).toBe('{"list":[]}');
		} finally {
			if (originalPlatform) {
				Object.defineProperty(process, 'platform', originalPlatform);
			}
		}
	});

	test('does not use script fallback when direct execution returns output', async () => {
		// A real on-disk hit so the resolver returns directly instead of
		// dropping into the (unmocked) login-shell lookup.
		existsSyncMock.mockImplementation((p: string) => p === '/usr/local/bin/multipass');

		execFileMock.mockImplementationOnce((...callArgs: unknown[]) => {
			const callback = callArgs[callArgs.length - 1] as (
				err: Error | null,
				result: { stdout: string; stderr: string }
			) => void;
			callback(null, { stdout: '{"list":[{"name":"vm"}]}', stderr: '' });
			return {} as unknown;
		});

		const result = await runMultipassCommand(['list', '--format', 'json']);

		expect(execFileMock).toHaveBeenCalledTimes(1);
		expect(result.stdout).toContain('vm');
	});
});

describe('runMultipassAction', () => {
	const macPkgPath = '/Library/Application Support/com.canonical.multipass/bin/multipass';

	function respond(err: Error | null, stdout = ''): void {
		execFileMock.mockImplementationOnce((...callArgs: unknown[]) => {
			const callback = callArgs[callArgs.length - 1] as (
				err: Error | null,
				result: { stdout: string; stderr: string }
			) => void;
			callback(err, { stdout, stderr: '' });
			return {} as unknown;
		});
	}

	test('passes a path with spaces and each argument unquoted to execFile', async () => {
		existsSyncMock.mockImplementation((p: string) => p === macPkgPath);
		respond(null);

		const result = await runMultipassAction(['restore', '--destructive', 'vm.snap one'], 'fallback');

		expect(result).toEqual({ success: true });
		expect(execFileMock).toHaveBeenCalledTimes(1);
		expect(execFileMock).toHaveBeenCalledWith(
			macPkgPath,
			['restore', '--destructive', 'vm.snap one'],
			expect.objectContaining({ env: expect.any(Object) }),
			expect.any(Function)
		);
	});

	test('runs snap multipass once even when stdout is empty', async () => {
		const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
		Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
		existsSyncMock.mockImplementation((p: string) => p === '/snap/bin/multipass');
		respond(null, '');

		try {
			await runMultipassAction(['delete', '--purge', 'vm.snap'], 'fallback');
			expect(execFileMock).toHaveBeenCalledTimes(1);
		} finally {
			if (originalPlatform) {
				Object.defineProperty(process, 'platform', originalPlatform);
			}
		}
	});

	test('returns the CLI stderr as the error', async () => {
		jest.spyOn(console, 'error').mockImplementation(() => undefined);
		existsSyncMock.mockImplementation((p: string) => p === '/usr/local/bin/multipass');
		const err = Object.assign(new Error('Command failed'), { stderr: 'instance "vm" does not exist\n' });
		respond(err);

		const result = await runMultipassAction(['recover', 'vm'], 'fallback');

		expect(result).toEqual({ success: false, error: 'instance "vm" does not exist' });
	});

	test('uses the fallback message when the error has no text', async () => {
		jest.spyOn(console, 'error').mockImplementation(() => undefined);
		existsSyncMock.mockImplementation((p: string) => p === '/usr/local/bin/multipass');
		respond(Object.assign(new Error(''), { stderr: '' }));

		const result = await runMultipassAction(['purge'], 'Failed to purge instances');

		expect(result).toEqual({ success: false, error: 'Failed to purge instances' });
	});
});
