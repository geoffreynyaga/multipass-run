import { exec } from 'child_process';
import { promisify } from 'util';
import { MULTIPASS_PATHS } from './constants';

const execAsync = promisify(exec);

export async function launchInstance(name?: string): Promise<{ success: boolean; error?: string; instanceName?: string }> {
	try {
		let lastError: any = null;
		const instanceName = name || `instance-${Date.now()}`;

		for (const multipassPath of MULTIPASS_PATHS) {
			try {
				// Launch with default Ubuntu LTS, can be customized
				await execAsync(`${multipassPath} launch --name ${instanceName}`);
				return { success: true, instanceName };
			} catch (err) {
				lastError = err;
				continue;
			}
		}

		return {
			success: false,
			error: lastError?.message || 'Failed to launch instance'
		};
	} catch (error: any) {
		console.error('Error launching instance:', error);
		return {
			success: false,
			error: error.message || 'Unknown error'
		};
	}
}
