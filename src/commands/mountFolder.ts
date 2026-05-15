import { MULTIPASS_PATHS } from '../utils/constants';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export async function mountFolder(
	vmName: string,
	hostPath: string,
	guestPath: string,
): Promise<{ success: boolean; error?: string }> {
	try {
		await runMultipassCommand(['mount', hostPath, `${vmName}:${guestPath}`]);
		return { success: true };
	} catch (err: any) {
		return {
			success: false,
			error: err?.stderr?.toString().trim() || err?.message || 'Failed to mount folder',
		};
	}
}

export async function unmountFolder(
	vmName: string,
	guestPath: string,
): Promise<{ success: boolean; error?: string }> {
	try {
		await runMultipassCommand(['umount', `${vmName}:${guestPath}`]);
		return { success: true };
	} catch (err: any) {
		return {
			success: false,
			error: err?.stderr?.toString().trim() || err?.message || 'Failed to unmount folder',
		};
	}
}
