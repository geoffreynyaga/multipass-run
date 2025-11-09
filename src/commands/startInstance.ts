import { MULTIPASS_PATHS } from '../utils/constants';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function startInstance(instanceName: string): Promise<{ success: boolean; error?: string }> {
	try {
		let lastError: any = null;

		for (const multipassPath of MULTIPASS_PATHS) {
			try {
				await execAsync(`${multipassPath} start ${instanceName}`);
				return { success: true };
			} catch (err) {
				lastError = err;
				continue;
			}
		}

		return {
			success: false,
			error: lastError?.message || 'Failed to start instance'
		};
	} catch (error: any) {
		console.error('Error starting instance:', error);
		return {
			success: false,
			error: error.message || 'Unknown error'
		};
	}
}
