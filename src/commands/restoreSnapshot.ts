import { MULTIPASS_PATHS } from '../utils/constants';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function restoreSnapshot(
	instanceName: string,
	snapshotName: string
): Promise<{ success: boolean; error?: string }> {
	let lastError: any = null;
	for (const multipassPath of MULTIPASS_PATHS) {
		try {
			await execAsync(`${multipassPath} restore --destructive ${instanceName}.${snapshotName}`);
			return { success: true };
		} catch (err: any) {
			lastError = err;
		}
	}

	return {
		success: false,
		error: lastError?.stderr?.trim() || lastError?.message || 'Failed to restore snapshot'
	};
}
