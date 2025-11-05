import { exec } from 'child_process';
import { promisify } from 'util';
import { MULTIPASS_PATHS } from './constants';

const execAsync = promisify(exec);

export async function recoverInstance(instanceName: string): Promise<{ success: boolean; error?: string }> {
	try {
		let lastError: any = null;

		for (const multipassPath of MULTIPASS_PATHS) {
			try {
				await execAsync(`${multipassPath} recover ${instanceName}`);
				return { success: true };
			} catch (err) {
				lastError = err;
				continue;
			}
		}

		return {
			success: false,
			error: lastError?.message || 'Failed to recover instance'
		};
	} catch (error: any) {
		console.error('Error recovering instance:', error);
		return {
			success: false,
			error: error.message || 'Unknown error'
		};
	}
}
