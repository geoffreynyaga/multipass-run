import { pickMultipassFromDisk } from '../multipassExecutable';

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
