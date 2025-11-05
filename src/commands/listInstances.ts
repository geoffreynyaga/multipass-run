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

export interface InstanceLists {
	active: MultipassInstance[];
	deleted: MultipassInstance[];
}

export async function getInstances(): Promise<MultipassInstance[]> {
	const lists = await getInstanceLists();
	return lists.active;
}

export async function getInstanceLists(): Promise<InstanceLists> {
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
			return { active: [], deleted: [] };
		}

		const data = JSON.parse(stdout);

		if (data.list && Array.isArray(data.list)) {
			const allInstances = data.list.map((instance: any) => ({
				name: instance.name || 'Unknown',
				state: instance.state || 'Unknown',
				ipv4: instance.ipv4?.[0] || '',
				release: instance.release || 'N/A'
			}));

			return {
				active: allInstances.filter((instance: MultipassInstance) => 
					instance.state?.toLowerCase() !== 'deleted'
				),
				deleted: allInstances.filter((instance: MultipassInstance) => 
					instance.state?.toLowerCase() === 'deleted'
				)
			};
		}
		return { active: [], deleted: [] };
	} catch (error) {
		console.error('Error fetching Multipass instances:', error);
		return { active: [], deleted: [] };
	}
}
