import { exec } from 'child_process';
import { promisify } from 'util';
import { MULTIPASS_PATHS } from './constants';

const execAsync = promisify(exec);

export interface LaunchInstanceOptions {
	name?: string;
	cpus?: string;
	memory?: string;
	disk?: string;
}

export async function launchInstance(
	nameOrOptions?: string | LaunchInstanceOptions
): Promise<{ success: boolean; error?: string; instanceName?: string }> {
	try {
		let lastError: any = null;
		
		// Handle both string (backward compatibility) and options object
		let options: LaunchInstanceOptions;
		if (typeof nameOrOptions === 'string') {
			options = { name: nameOrOptions };
		} else {
			options = nameOrOptions || {};
		}
		
		const instanceName = options.name || `instance-${Date.now()}`;
		
		// Build command with optional parameters
		let command = `launch --name ${instanceName}`;
		if (options.cpus) {
			command += ` --cpus ${options.cpus}`;
		}
		if (options.memory) {
			command += ` --memory ${options.memory}`;
		}
		if (options.disk) {
			command += ` --disk ${options.disk}`;
		}

		for (const multipassPath of MULTIPASS_PATHS) {
			try {
				await execAsync(`${multipassPath} ${command}`);
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
