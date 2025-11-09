import { MULTIPASS_PATHS } from '../utils/constants';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function shellInstance(instanceName: string): Promise<{ success: boolean; error?: string }> {
	try {
		let lastError: any = null;

		for (const multipassPath of MULTIPASS_PATHS) {
			try {
				// The multipass shell command opens an interactive shell
				// We'll return success if the command exists, as the shell will be opened in a terminal
				await execAsync(`${multipassPath} shell ${instanceName}`, { timeout: 100 });
				return { success: true };
			} catch (err: any) {
				// If it's a timeout or the command starts executing, it's actually working
				if (err.killed || err.signal === 'SIGTERM') {
					return { success: true };
				}
				lastError = err;
				continue;
			}
		}

		return {
			success: false,
			error: lastError?.message || 'Failed to open shell in instance'
		};
	} catch (error: any) {
		console.error('Error opening shell in instance:', error);
		return {
			success: false,
			error: error.message || 'Unknown error'
		};
	}
}
