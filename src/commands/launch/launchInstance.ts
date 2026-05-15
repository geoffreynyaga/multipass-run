
import { runMultipassCommand, spawnMultipassCommand } from '../../utils/multipassExecutable';

export interface LaunchInstanceOptions {
	name?: string;
	image?: string;
	cpus?: string;
	memory?: string;
	disk?: string;
	cloudInitPath?: string;
	onProgress?: (message: string, isDownloading?: boolean) => void;
}

export function parseLaunchedInstanceName(output: string): string | undefined {
	const match = output.match(/Launched:\s*([^\s]+)/i);
	return match?.[1];
}

export function buildLaunchArgs(options: LaunchInstanceOptions, instanceName?: string): string[] {
	const args: string[] = ['launch'];

	// Image (positional, must come before --name)
	if (options.image) {
		args.push(options.image);
	}

	if (instanceName) {
		args.push('--name', instanceName);
	}

	if (options.cpus) {
		args.push('--cpus', options.cpus);
	}
	if (options.memory) {
		args.push('--memory', options.memory);
	}
	if (options.disk) {
		args.push('--disk', options.disk);
	}
	if (options.cloudInitPath) {
		args.push('--cloud-init', options.cloudInitPath);
	}

	return args;
}

export async function launchInstance(
	nameOrOptions?: string | LaunchInstanceOptions
): Promise<{ success: boolean; error?: string; instanceName?: string; wasDownloading?: boolean }> {
	try {
		let lastError: any = null;

		// Handle both string (backward compatibility) and options object
		let options: LaunchInstanceOptions;
		if (typeof nameOrOptions === 'string') {
			options = { name: nameOrOptions };
		} else {
			options = nameOrOptions || {};
		}

		const instanceName = options.name?.trim();
		const args = buildLaunchArgs(options, instanceName);

		console.log('[launchInstance] Args:', args.join(' '));
		console.log('[launchInstance] Image:', options.image);

		let wasDownloading = false;

		try {
			// If we have a progress callback, use spawn to monitor output
			if (options.onProgress) {
				const result = await new Promise<{
					success: boolean;
					error?: string;
					wasDownloading: boolean;
					output: string;
				}>((resolve) => {
					void spawnMultipassCommand(args).then((proc) => {

						let stdout = '';
						let stderr = '';
						let downloadDetected = false;

						proc.stdout.on('data', (data) => {
							const output = data.toString();
							stdout += output;

							// Check for download/retrieval messages
							if (output.includes('Retrieving image') || output.includes('Downloading')) {
								downloadDetected = true;
								wasDownloading = true;

								// Extract percentage if available
								const percentMatch = output.match(/(\d+)%/);
								if (percentMatch) {
									options.onProgress?.(`Retrieving image: ${percentMatch[1]}%`, true);
								} else {
									options.onProgress?.('Retrieving image...', true);
								}
							} else if (output.includes('Launching') || output.includes('Starting')) {
								options.onProgress?.('Creating instance...', false);
							}
						});

						proc.stderr.on('data', (data) => {
							stderr += data.toString();
						});

						proc.on('close', (code) => {
							if (code === 0) {
								resolve({ success: true, wasDownloading: downloadDetected, output: stdout + stderr });
							} else {
								resolve({
									success: false,
									error: stderr || stdout || 'Failed to launch instance',
									wasDownloading: downloadDetected,
									output: stdout + stderr
								});
							}
						});

						proc.on('error', (err) => {
							resolve({
								success: false,
								error: err.message,
								wasDownloading: downloadDetected,
								output: stdout + stderr
							});
						});
					}).catch((err: Error) => {
						resolve({
							success: false,
							error: err.message,
							wasDownloading: false,
							output: '',
						});
					});
				});

				if (result.success) {
					const launchedName = instanceName || parseLaunchedInstanceName(result.output);
					return { success: true, instanceName: launchedName, wasDownloading: result.wasDownloading };
				}

				lastError = new Error(result.error);
			} else {
				const { stdout, stderr } = await runMultipassCommand(args);
				const launchedName = instanceName || parseLaunchedInstanceName(stdout + stderr);
				return { success: true, instanceName: launchedName, wasDownloading: false };
			}
		} catch (err) {
			lastError = err;
		}

		return {
			success: false,
			error: lastError?.message || 'Failed to launch instance',
			wasDownloading
		};
	} catch (error: any) {
		console.error('Error launching instance:', error);
		return {
			success: false,
			error: error.message || 'Unknown error',
			wasDownloading: false
		};
	}
}
