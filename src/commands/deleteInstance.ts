import { runMultipassCommand } from '../utils/multipassExecutable';

export async function deleteInstance(instanceName: string, purge: boolean = false): Promise<{ success: boolean; error?: string }> {
	const args = purge ? ['delete', instanceName, '--purge'] : ['delete', instanceName];
	try {
		await runMultipassCommand(args);
		return { success: true };
	} catch (err: any) {
		console.error('Error deleting instance:', err);
		return {
			success: false,
			error: err?.stderr?.toString().trim() || err?.message || 'Failed to delete instance',
		};
	}
}
