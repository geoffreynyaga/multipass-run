import { runMultipassCommand } from './multipassExecutable';
import { type FindImagesResult,parseFindImagesJson } from './multipassImages';

export async function findImages(): Promise<FindImagesResult | null> {
	try {
		let stdout = '';
		let lastError: unknown = null;

		try {
			const result = await runMultipassCommand(['find', '--format', 'json']);
			stdout = result.stdout;
		} catch (err) {
			lastError = err;
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
