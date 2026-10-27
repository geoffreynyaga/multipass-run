import { type MultipassActionResult, runMultipassAction } from '../utils/multipassExecutable';

export async function suspendInstance(instanceName: string): Promise<MultipassActionResult> {
	return runMultipassAction(['suspend', instanceName], 'Failed to suspend instance');
}
