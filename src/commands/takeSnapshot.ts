import { execMultipass, multipassErrorMessage } from '../utils/multipassExecutable';

export interface TakeSnapshotOptions {
	name?: string;
	comment?: string;
}

export async function takeSnapshot(
	instanceName: string,
	options: TakeSnapshotOptions = {}
): Promise<{ success: boolean; error?: string; snapshotName?: string }> {
	const args = ['snapshot', instanceName];
	if (options.name) {args.push('--name', options.name);}
	if (options.comment) {args.push('--comment', options.comment);}

	try {
		const { stdout } = await execMultipass(args);
		const match = stdout.match(/Snapshot taken:\s*\S+\.(\S+)/);
		return { success: true, snapshotName: match?.[1] || options.name };
	} catch (err) {
		return { success: false, error: multipassErrorMessage(err, 'Failed to take snapshot') };
	}
}
