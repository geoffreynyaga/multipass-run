import { execFile } from 'child_process';
import { promisify } from 'util';

import { MULTIPASS_PATHS } from '../utils/constants';

const execFileAsync = promisify(execFile);

export async function mountFolder(
	vmName: string,
	hostPath: string,
	guestPath: string,
): Promise<{ success: boolean; error?: string }> {
	let lastError: any = null;
	for (const mp of MULTIPASS_PATHS) {
		try {
			await execFileAsync(mp, ['mount', hostPath, `${vmName}:${guestPath}`]);
			return { success: true };
		} catch (err: any) {
			lastError = err;
			continue;
		}
	}
	return {
		success: false,
		error: lastError?.stderr?.toString().trim() || lastError?.message || 'Failed to mount folder',
	};
}

export async function unmountFolder(
	vmName: string,
	guestPath: string,
): Promise<{ success: boolean; error?: string }> {
	let lastError: any = null;
	for (const mp of MULTIPASS_PATHS) {
		try {
			await execFileAsync(mp, ['umount', `${vmName}:${guestPath}`]);
			return { success: true };
		} catch (err: any) {
			lastError = err;
			continue;
		}
	}
	return {
		success: false,
		error: lastError?.stderr?.toString().trim() || lastError?.message || 'Failed to unmount folder',
	};
}
