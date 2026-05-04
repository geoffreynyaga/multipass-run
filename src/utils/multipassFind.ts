import { MULTIPASS_PATHS } from './constants';
import { exec } from 'child_process';
import { parseFindImagesJson, type FindImagesResult } from './multipassImages';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function findImages(): Promise<FindImagesResult | null> {
	try {
		let stdout = '';
		let lastError: unknown = null;

		for (const multipassPath of MULTIPASS_PATHS) {
			try {
				const result = await execAsync(`${multipassPath} find --format json`);
				stdout = result.stdout;
				break;
			} catch (err) {
				lastError = err;
				continue;
			}
		}

		if (!stdout) {
			console.error('Failed to execute multipass find:', lastError);
			return null;
		}

		return parseFindImagesJson(stdout);
	} catch (error) {
		console.error('Error fetching Multipass images:', error);
		return null;
	}
}
