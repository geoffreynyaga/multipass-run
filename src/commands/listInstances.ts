import { runMultipassCommand } from '../utils/multipassExecutable';

export interface MultipassInstance {
	name: string;
	state: string;
	ipv4: string;
	release: string;
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

export async function getInstanceLists(): Promise<InstanceLists> {
	try {
		let stdout = '';
		let lastError: any = null;

		try {
			const result = await runMultipassCommand(['list', '--format', 'json']);
			stdout = result.stdout;
		} catch (err) {
			lastError = err;
		}

		if (!stdout) {
			// Check the error type
			const errorMessage = lastError?.message || '';
			
			// Check if daemon is not running (socket connection error)
			const isDaemonNotRunning = errorMessage.includes('cannot connect to the multipass socket') ||
									   errorMessage.includes('socket') && errorMessage.includes('connect');
			
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
			}			console.error('Failed to execute multipass:', lastError);
			return { 
				active: [], 
				deleted: [],
				error: {
					type: 'other',
					message: errorMessage || 'Failed to execute multipass command'
				}
			};
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
