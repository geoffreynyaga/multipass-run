import { type MultipassActionResult, runMultipassAction } from '../utils/multipassExecutable';

export async function deleteInstance(instanceName: string, purge: boolean = false): Promise<MultipassActionResult> {
	const args = purge ? ['delete', instanceName, '--purge'] : ['delete', instanceName];
	return runMultipassAction(args, 'Failed to delete instance');
}
