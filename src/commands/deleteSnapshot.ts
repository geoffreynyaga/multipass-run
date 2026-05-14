import { exec } from 'child_process';
import { promisify } from 'util';

import { MULTIPASS_PATHS } from '../utils/constants';

const execAsync = promisify(exec);

export async function deleteSnapshot(
	instanceName: string,
	snapshotName: string
): Promise<{ success: boolean; error?: string }> {
	let lastError: any = null;
	for (const multipassPath of MULTIPASS_PATHS) {
		try {
			await execAsync(`${multipassPath} delete --purge ${instanceName}.${snapshotName}`);
			return { success: true };
		} catch (err: any) {
			lastError = err;
		}
	}

	return {
		success: false,
		error: lastError?.stderr?.trim() || lastError?.message || 'Failed to delete snapshot'
	};
}
