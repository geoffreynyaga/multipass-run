import { type MultipassActionResult, runMultipassAction } from '../utils/multipassExecutable';

export async function recoverInstance(instanceName: string): Promise<MultipassActionResult> {
	return runMultipassAction(['recover', instanceName], 'Failed to recover instance');
}
