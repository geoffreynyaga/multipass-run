import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface MultipassInstance {
	name: string;
	state: string;
	ipv4: string;
	release: string;
}

export class MultipassService {
	private static readonly MULTIPASS_PATHS = [
		'/usr/local/bin/multipass',
		'/opt/homebrew/bin/multipass',
		'multipass' // fallback to PATH
	];

	public static async getInstances(): Promise<MultipassInstance[]> {
		try {
			let stdout = '';
			let lastError: any = null;

			for (const multipassPath of this.MULTIPASS_PATHS) {
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
				return data.list.map((instance: any) => ({
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
}
