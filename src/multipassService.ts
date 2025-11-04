import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface MultipassInstance {
	name: string;
	state: string;
	ipv4: string;
	release: string;
}

export interface MultipassInstanceInfo {
	name: string;
	state: string;
	zone: string;
	snapshots: number;
	ipv4: string;
	release: string;
	cpus: string;
	load: string;
	diskUsage: string;
	memoryUsage: string;
	mounts: string;
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

	public static async getInstanceInfo(instanceName: string): Promise<MultipassInstanceInfo | null> {
		try {
			let stdout = '';
			let lastError: any = null;

			for (const multipassPath of this.MULTIPASS_PATHS) {
				try {
					const result = await execAsync(`${multipassPath} info ${instanceName} --format json`);
					stdout = result.stdout;
					break;
				} catch (err) {
					lastError = err;
					continue;
				}
			}

			if (!stdout) {
				console.error('Failed to execute multipass info:', lastError);
				return null;
			}

			const data = JSON.parse(stdout);
			const info = data.info?.[instanceName];

			if (!info) {
				return null;
			}

			// Helper function to format bytes to GB
			const formatToGB = (bytes: number): string => {
				const gb = bytes / (1024 * 1024 * 1024);
				return gb.toFixed(2) + ' GB';
			};

			// Calculate disk usage
			let diskUsage = 'N/A';
			if (info.disks && info.disks.sda1) {
				const used = formatToGB(parseInt(info.disks.sda1.used));
				const total = formatToGB(parseInt(info.disks.sda1.total));
				diskUsage = `${used} / ${total}`;
			}

			// Calculate memory usage
			let memoryUsage = 'N/A';
			if (info.memory) {
				const used = formatToGB(parseInt(info.memory.used));
				const total = formatToGB(parseInt(info.memory.total));
				memoryUsage = `${used} / ${total}`;
			}

			// Format zone
			const zone = info.zone?.name || 'N/A';

			return {
				name: instanceName,
				state: info.state || 'Unknown',
				zone: zone,
				snapshots: parseInt(info.snapshot_count) || 0,
				ipv4: info.ipv4?.[0] || '',
				release: info.release || 'N/A',
				cpus: info.cpu_count || 'N/A',
				load: info.load ? info.load.join(' ') : 'N/A',
				diskUsage: diskUsage,
				memoryUsage: memoryUsage,
				mounts: info.mounts && Object.keys(info.mounts).length > 0
					? Object.entries(info.mounts).map(([source, target]: [string, any]) =>
						`${source} => ${target.target_path || target}`
					).join(', ')
					: '--'
			};
		} catch (error) {
			console.error('Error fetching instance info:', error);
			return null;
		}
	}
}
