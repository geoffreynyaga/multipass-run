import { runMultipassCommand } from '../utils/multipassExecutable';

export async function suspendInstance(instanceName: string): Promise<{ success: boolean; error?: string }> {
	try {
		await runMultipassCommand(['suspend', instanceName]);
		return { success: true };
	} catch (err: any) {
		console.error('Error suspending instance:', err);
		return {
			success: false,
			error: err?.stderr?.toString().trim() || err?.message || 'Failed to suspend instance',
		};
	}
}
