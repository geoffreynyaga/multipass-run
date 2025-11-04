import { exec } from 'child_process';
import { promisify } from 'util';
import { MULTIPASS_PATHS } from './constants';

const execAsync = promisify(exec);

export interface MultipassInstance {
	name: string;
	state: string;
	ipv4: string;
	release: string;
}

export async function getInstances(): Promise<MultipassInstance[]> {
	try {
		let stdout = '';
		let lastError: any = null;

		for (const multipassPath of MULTIPASS_PATHS) {
			try {
				const result = await execAsync(`${multipassPath} list --format json`);
				stdout = result.stdout;
				break;
			} catch (err) {
				lastError = err;
				continue;
			}
		}

		if (!stdout) {
			console.error('Failed to execute multipass:', lastError);
			return [];
		}

		const data = JSON.parse(stdout);

		if (data.list && Array.isArray(data.list)) {
			return data.list
				.filter((instance: any) => instance.state?.toLowerCase() !== 'deleted')
				.map((instance: any) => ({
					name: instance.name || 'Unknown',
					state: instance.state || 'Unknown',
					ipv4: instance.ipv4?.[0] || '',
					release: instance.release || 'N/A'
				}));
		}
		return [];
	} catch (error) {
		console.error('Error fetching Multipass instances:', error);
		return [];
	}
}
