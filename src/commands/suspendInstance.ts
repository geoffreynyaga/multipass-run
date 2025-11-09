import { MULTIPASS_PATHS } from '../utils/constants';
import { exec } from 'child_process';

export async function suspendInstance(instanceName: string): Promise<{ success: boolean; error?: string }> {
	return new Promise((resolve) => {
		// Try multiple common paths for multipass
		const tryPaths = async (paths: string[], index: number = 0): Promise<void> => {
			if (index >= paths.length) {
				resolve({ success: false, error: 'multipass command not found' });
				return;
			}

			const multipassPath = paths[index];
			const command = `${multipassPath} suspend ${instanceName}`;

			exec(command, (error, stdout, stderr) => {
				if (error) {
					if (error.message.includes('not found') || error.message.includes('No such file')) {
						// Try next path
						tryPaths(paths, index + 1);
					} else {
						resolve({ success: false, error: stderr || error.message });
					}
				} else {
					resolve({ success: true });
				}
			});
		};

		tryPaths(MULTIPASS_PATHS);
	});
}
