import { runMultipassCommand } from '../utils/multipassExecutable';

export async function startInstance(instanceName: string): Promise<{ success: boolean; error?: string }> {
	try {
		await runMultipassCommand(['start', instanceName]);
		return { success: true };
	} catch (err: any) {
		console.error('Error starting instance:', err);
		return {
			success: false,
			error: err?.stderr?.toString().trim() || err?.message || 'Failed to start instance',
		};
	}
}
