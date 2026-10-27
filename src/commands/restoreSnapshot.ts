import { type MultipassActionResult, runMultipassAction } from '../utils/multipassExecutable';

export async function restoreSnapshot(instanceName: string, snapshotName: string): Promise<MultipassActionResult> {
	return runMultipassAction(['restore', '--destructive', `${instanceName}.${snapshotName}`], 'Failed to restore snapshot');
}
