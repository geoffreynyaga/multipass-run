import { runMultipassCommand } from '../utils/multipassExecutable';

export interface VMZone {
	name: string;
	available: boolean;
}

export interface MultipassInstance {
	name: string;
	state: string;
	ipv4: string;
	release: string;
	zone?: VMZone;
}

/** Shape of a single entry in `multipass list --format json`. */
interface RawMultipassInstance {
	name?: string;
	state?: string;
	ipv4?: string[];
	release?: string;
	zone?: VMZone | null;
}

export interface InstanceLists {
	active: MultipassInstance[];
	deleted: MultipassInstance[];
	error?: {
		type: 'not-installed' | 'daemon-not-running' | 'other';
		message: string;
	};
}

export async function getInstances(): Promise<MultipassInstance[]> {
	const lists = await getInstanceLists();
	return lists.active;
}

export async function getInstanceLists(options: { timeout?: number } = {}): Promise<InstanceLists> {
	try {
		let stdout = '';
		let lastError: unknown = null;

		try {
			const result = await runMultipassCommand(['list', '--format', 'json'], options);
			stdout = result.stdout;
		} catch (err) {
			lastError = err;
		}

		if (!stdout) {
			// Check the error type
			const errorMessage = lastError instanceof Error ? lastError.message : '';

			// Check if daemon is not running (socket connection error)
			const isDaemonNotRunning = errorMessage.includes('cannot connect to the multipass socket') ||
									   (errorMessage.includes('socket') && errorMessage.includes('connect'));
			
			if (isDaemonNotRunning) {
				console.error('Multipass daemon is not running');
				return { 
					active: [], 
					deleted: [],
					error: {
						type: 'daemon-not-running',
						message: 'Multipass daemon is not running. Please start Multipass.'
					}
				};
			}
			
			// Check if multipass is not installed by looking for "command not found" in the error
			const isNotInstalled = errorMessage.includes('command not found') || 
							  errorMessage.includes('not found') ||
							  errorMessage.includes('No such file or directory') ||
							  errorMessage.includes('ENOENT');
			
			if (isNotInstalled) {
				console.error('Multipass is not installed');
				return { 
					active: [], 
					deleted: [],
					error: {
						type: 'not-installed',
						message: 'Multipass is not installed on your system'
					}
				};
			}

			console.error('Failed to execute multipass:', lastError);
			return {
				active: [], 
				deleted: [],
				error: {
					type: 'other',
					message: errorMessage || 'Failed to execute multipass command'
				}
			};
		}

		const data = JSON.parse(stdout) as { list?: RawMultipassInstance[] };

		if (data.list && Array.isArray(data.list)) {
			const allInstances: MultipassInstance[] = data.list.map((instance) => ({
				name: instance.name || 'Unknown',
				state: instance.state || 'Unknown',
				ipv4: instance.ipv4?.[0] || '',
				release: instance.release || 'N/A',
				...(instance.zone && typeof instance.zone.name === 'string' && typeof instance.zone.available === 'boolean'
					? { zone: { name: instance.zone.name, available: instance.zone.available } } : {})
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
		return { active: [], deleted: [], error: { type: 'other', message: 'Invalid VM list response.' } };
	} catch (error) {
		console.error('Error fetching Multipass instances:', error);
		return { 
			active: [], 
			deleted: [],
			error: {
				type: 'other',
				message: error instanceof Error ? error.message : 'Unknown error occurred'
			}
		};
	}
}
