import { MULTIPASS_PATHS } from '../utils/constants';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface MultipassImage {
	name: string;
	aliases: string[];
	os: string;
	release: string;
	remote: string;
	version: string;
}

export interface FindImagesResult {
	images: Record<string, MultipassImage>;
	blueprints: Record<string, MultipassImage>;
	errors: string[];
}

export async function findImages(): Promise<FindImagesResult | null> {
	try {
		let stdout = '';
		let lastError: any = null;

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

		const data = JSON.parse(stdout);

		return {
			images: data.images || {},
			blueprints: data['blueprints (deprecated)'] || data.blueprints || {},
			errors: data.errors || []
		};
	} catch (error) {
		console.error('Error fetching Multipass images:', error);
		return null;
	}
}
