import { type MultipassActionResult, runMultipassAction } from '../utils/multipassExecutable';

export async function mountFolder(vmName: string, hostPath: string, guestPath: string): Promise<MultipassActionResult> {
	return runMultipassAction(['mount', hostPath, `${vmName}:${guestPath}`], 'Failed to mount folder');
}

export async function unmountFolder(vmName: string, guestPath: string): Promise<MultipassActionResult> {
	return runMultipassAction(['umount', `${vmName}:${guestPath}`], 'Failed to unmount folder');
}
