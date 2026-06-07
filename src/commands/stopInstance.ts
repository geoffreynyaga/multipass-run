import { runMultipassCommand } from '../utils/multipassExecutable';

export async function stopInstance(instanceName: string): Promise<{ success: boolean; error?: string }> {
	try {
		await runMultipassCommand(['stop', instanceName]);
		return { success: true };
	} catch (err: any) {
		console.error('Error stopping instance:', err);
		return {
			success: false,
			error: err?.stderr?.toString().trim() || err?.message || 'Failed to stop instance',
		};
	}
}
