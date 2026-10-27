import { type MultipassActionResult, runMultipassAction } from '../utils/multipassExecutable';

export async function stopInstance(instanceName: string): Promise<MultipassActionResult> {
	return runMultipassAction(['stop', instanceName], 'Failed to stop instance');
}
