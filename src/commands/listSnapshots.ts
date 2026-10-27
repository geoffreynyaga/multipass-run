import { runMultipassCommand } from '../utils/multipassExecutable';

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
	let stdout: string;
	try {
		({ stdout } = await runMultipassCommand(['info', instanceName, '--snapshots', '--format', 'json']));
	} catch (err) {
		console.error('listSnapshots failed:', err);
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
