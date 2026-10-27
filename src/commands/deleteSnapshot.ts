import { type MultipassActionResult, runMultipassAction } from '../utils/multipassExecutable';

export async function deleteSnapshot(instanceName: string, snapshotName: string): Promise<MultipassActionResult> {
	return runMultipassAction(['delete', '--purge', `${instanceName}.${snapshotName}`], 'Failed to delete snapshot');
}
