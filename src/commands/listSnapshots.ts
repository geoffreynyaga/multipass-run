import { MULTIPASS_PATHS } from '../utils/constants';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface MultipassSnapshot {
	name: string;
	instance: string;
	comment: string;
	parent: string;
	children: string[];
	created: string;
	cpus: string;
	diskSpace: string;
	memorySize: string;
}

export async function listSnapshots(instanceName: string): Promise<MultipassSnapshot[]> {
	let stdout = '';
	let lastError: any = null;

	for (const multipassPath of MULTIPASS_PATHS) {
		try {
			const result = await execAsync(`${multipassPath} info ${instanceName} --snapshots --format json`);
			stdout = result.stdout;
			break;
		} catch (err) {
			lastError = err;
		}
	}

	if (!stdout) {
		console.error('listSnapshots failed:', lastError);
		return [];
	}

	try {
		const data = JSON.parse(stdout);
		const instanceBlock = data?.info?.[instanceName];
		const snaps = instanceBlock?.snapshots;
		if (!snaps || typeof snaps !== 'object') {
			return [];
		}

		return Object.entries(snaps).map(([name, raw]: [string, any]) => ({
			name,
			instance: instanceName,
			comment: raw?.comment ?? '',
			parent: raw?.parent ?? '',
			children: Array.isArray(raw?.children) ? raw.children : [],
			created: raw?.created ?? '',
			cpus: raw?.cpu_count ?? '',
			diskSpace: raw?.disk_space ?? '',
			memorySize: raw?.memory_size ?? ''
		}));
	} catch (err) {
		console.error('listSnapshots parse failed:', err);
		return [];
	}
}
