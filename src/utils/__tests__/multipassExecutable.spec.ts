jest.mock('child_process', () => {
	const actual = jest.requireActual('child_process');
	return {
		...actual,
		exec: jest.fn(),
		execFile: jest.fn(),
	};
});

import * as cp from 'child_process';

import { pickMultipassFromDisk, resetMultipassExecutableCache, runMultipassCommand } from '../multipassExecutable';

const execFileMock = cp.execFile as unknown as jest.Mock;

beforeEach(() => {
	jest.restoreAllMocks();
	resetMultipassExecutableCache();
	execFileMock.mockReset();
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
	});

	test('does not use script fallback when direct execution returns output', async () => {
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
