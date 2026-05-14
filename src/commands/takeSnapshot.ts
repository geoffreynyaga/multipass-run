import { exec } from 'child_process';
import { promisify } from 'util';

import { MULTIPASS_PATHS } from '../utils/constants';

const execAsync = promisify(exec);

export interface TakeSnapshotOptions {
	name?: string;
	comment?: string;
}

function shellQuote(value: string): string {
	return `'${value.replace(/'/g, "'\\''")}'`;
}

export async function takeSnapshot(
	instanceName: string,
	options: TakeSnapshotOptions = {}
): Promise<{ success: boolean; error?: string; snapshotName?: string }> {
	const args: string[] = [];
	if (options.name) {args.push('--name', shellQuote(options.name));}
	if (options.comment) {args.push('--comment', shellQuote(options.comment));}

	let lastError: any = null;
	for (const multipassPath of MULTIPASS_PATHS) {
		try {
			const cmd = `${multipassPath} snapshot ${instanceName} ${args.join(' ')}`.trim();
			const { stdout } = await execAsync(cmd);
			const match = stdout.match(/Snapshot taken:\s*\S+\.(\S+)/);
			return { success: true, snapshotName: match?.[1] || options.name };
		} catch (err: any) {
			lastError = err;
		}
	}

	return {
		success: false,
		error: lastError?.stderr?.trim() || lastError?.message || 'Failed to take snapshot'
	};
}
