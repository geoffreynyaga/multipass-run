import { type MultipassActionResult, runMultipassAction } from '../utils/multipassExecutable';

export async function startInstance(instanceName: string): Promise<MultipassActionResult> {
	return runMultipassAction(['start', instanceName], 'Failed to start instance');
}
