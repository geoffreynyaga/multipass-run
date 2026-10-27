import { type MultipassActionResult, runMultipassAction } from '../utils/multipassExecutable';

export async function purgeInstance(): Promise<MultipassActionResult> {
	return runMultipassAction(['purge'], 'Failed to purge instances');
}
