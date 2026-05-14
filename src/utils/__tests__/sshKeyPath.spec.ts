import * as path from 'path';

import {
	KEY_NAME_ED25519,
	KEY_NAME_RSA_LEGACY,
	keygenArgs,
	resolveKeyPaths,
} from '../sshKeyPath';

const sshDir = '/home/user/.ssh';

describe('resolveKeyPaths', () => {
	test('defaults to ed25519 on a fresh install', () => {
		const result = resolveKeyPaths(sshDir, () => false);
		expect(result.type).toBe('ed25519');
		expect(result.privateKey).toBe(path.join(sshDir, KEY_NAME_ED25519));
		expect(result.publicKey).toBe(path.join(sshDir, `${KEY_NAME_ED25519}.pub`));
	});

	test('keeps existing legacy RSA key (does not break old installs)', () => {
		const rsaPath = path.join(sshDir, KEY_NAME_RSA_LEGACY);
		const result = resolveKeyPaths(sshDir, (p) => p === rsaPath);
		expect(result.type).toBe('rsa');
		expect(result.privateKey).toBe(rsaPath);
		expect(result.publicKey).toBe(`${rsaPath}.pub`);
	});

	test('uses ed25519 if it already exists and no RSA present', () => {
		const ed = path.join(sshDir, KEY_NAME_ED25519);
		const result = resolveKeyPaths(sshDir, (p) => p === ed);
		expect(result.type).toBe('ed25519');
	});

	test('prefers RSA when both keys exist (avoid disrupting working setup)', () => {
		const rsa = path.join(sshDir, KEY_NAME_RSA_LEGACY);
		const ed = path.join(sshDir, KEY_NAME_ED25519);
		const result = resolveKeyPaths(sshDir, (p) => p === rsa || p === ed);
		expect(result.type).toBe('rsa');
	});

	test('does not check ed25519 path if RSA already found (early exit)', () => {
		const rsa = path.join(sshDir, KEY_NAME_RSA_LEGACY);
		const ed = path.join(sshDir, KEY_NAME_ED25519);
		const calls: string[] = [];
		resolveKeyPaths(sshDir, (p) => {
			calls.push(p);
			return p === rsa;
		});
		expect(calls).toContain(rsa);
		expect(calls).not.toContain(ed);
	});

	test('checks ed25519 only after rejecting RSA', () => {
		const rsa = path.join(sshDir, KEY_NAME_RSA_LEGACY);
		const ed = path.join(sshDir, KEY_NAME_ED25519);
		const calls: string[] = [];
		resolveKeyPaths(sshDir, (p) => {
			calls.push(p);
			return false;
		});
		expect(calls.indexOf(rsa)).toBeLessThan(calls.indexOf(ed));
	});

	test('honours non-default ssh dir path', () => {
		const customDir = '/tmp/ssh-fixture';
		const result = resolveKeyPaths(customDir, () => false);
		expect(result.privateKey.startsWith(customDir + path.sep)).toBe(true);
	});
});

describe('keygenArgs', () => {
	test('builds ed25519 args without bit length', () => {
		const args = keygenArgs('ed25519', '/path/key');
		expect(args).toEqual(['-t', 'ed25519', '-f', '/path/key', '-N', '', '-C', 'multipass-vscode']);
	});

	test('ed25519 args do NOT include -b (irrelevant for ed25519)', () => {
		const args = keygenArgs('ed25519', '/p');
		expect(args).not.toContain('-b');
	});

	test('builds rsa args with 4096 bit length', () => {
		const args = keygenArgs('rsa', '/path/key');
		expect(args).toContain('-b');
		expect(args).toContain('4096');
		expect(args).toContain('rsa');
	});

	test('honours custom comment', () => {
		const args = keygenArgs('ed25519', '/p', 'custom-tag');
		expect(args[args.length - 1]).toBe('custom-tag');
	});

	test('passes empty passphrase via -N ""', () => {
		const args = keygenArgs('ed25519', '/p');
		const nIdx = args.indexOf('-N');
		expect(nIdx).toBeGreaterThan(-1);
		expect(args[nIdx + 1]).toBe('');
	});

	test('passes private key path after -f', () => {
		const args = keygenArgs('rsa', '/abs/path/key.priv');
		const fIdx = args.indexOf('-f');
		expect(fIdx).toBeGreaterThan(-1);
		expect(args[fIdx + 1]).toBe('/abs/path/key.priv');
	});
});
