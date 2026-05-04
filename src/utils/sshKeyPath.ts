import * as path from 'path';

export const KEY_NAME_ED25519 = 'multipass_id_ed25519';
export const KEY_NAME_RSA_LEGACY = 'multipass_id_rsa';

export type KeyType = 'ed25519' | 'rsa';

export interface KeyPaths {
	privateKey: string;
	publicKey: string;
	type: KeyType;
}

/**
 * Picks which key pair to use for an SSH operation:
 * - If a legacy RSA pair already exists, keep using it (don't break existing
 *   installs that previously generated multipass_id_rsa).
 * - If an ed25519 pair already exists, use it.
 * - Otherwise, plan to create a new ed25519 pair.
 */
export function resolveKeyPaths(
	sshDir: string,
	exists: (p: string) => boolean
): KeyPaths {
	const ed25519 = makePaths(sshDir, KEY_NAME_ED25519, 'ed25519');
	const rsa = makePaths(sshDir, KEY_NAME_RSA_LEGACY, 'rsa');

	if (exists(rsa.privateKey)) {
		return rsa;
	}
	if (exists(ed25519.privateKey)) {
		return ed25519;
	}
	return ed25519;
}

export function keygenArgs(type: KeyType, privateKeyPath: string, comment = 'multipass-vscode'): string[] {
	if (type === 'ed25519') {
		return ['-t', 'ed25519', '-f', privateKeyPath, '-N', '', '-C', comment];
	}
	return ['-t', 'rsa', '-b', '4096', '-f', privateKeyPath, '-N', '', '-C', comment];
}

function makePaths(sshDir: string, baseName: string, type: KeyType): KeyPaths {
	const privateKey = path.join(sshDir, baseName);
	return { privateKey, publicKey: `${privateKey}.pub`, type };
}
