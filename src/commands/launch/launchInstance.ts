import * as vscode from 'vscode';

import { exec, spawn } from 'child_process';

import { MULTIPASS_PATHS } from '../../utils/constants';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface LaunchInstanceOptions {
	name?: string;
	image?: string;
	cpus?: string;
	memory?: string;
	disk?: string;
	onProgress?: (message: string, isDownloading?: boolean) => void;
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

		const instanceName = options.name || `instance-${Date.now()}`;

		// Build command with optional parameters
		let command = `launch`;

		// Add image if specified (must come before --name)
		if (options.image) {
			command += ` ${options.image}`;
		}

		command += ` --name ${instanceName}`;

		if (options.cpus) {
			command += ` --cpus ${options.cpus}`;
		}
		if (options.memory) {
			command += ` --memory ${options.memory}`;
		}
		if (options.disk) {
			command += ` --disk ${options.disk}`;
		}

		let wasDownloading = false;

		for (const multipassPath of MULTIPASS_PATHS) {
			try {
				// If we have a progress callback, use spawn to monitor output
				if (options.onProgress) {
					const result = await new Promise<{ success: boolean; error?: string; wasDownloading: boolean }>((resolve) => {
						const args = command.split(' ');
						const proc = spawn(multipassPath, args);

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
								resolve({ success: true, wasDownloading: downloadDetected });
							} else {
								resolve({
									success: false,
									error: stderr || stdout || 'Failed to launch instance',
									wasDownloading: downloadDetected
								});
							}
						});

						proc.on('error', (err) => {
							resolve({
								success: false,
								error: err.message,
								wasDownloading: downloadDetected
							});
						});
					});

					if (result.success) {
						return { success: true, instanceName, wasDownloading: result.wasDownloading };
					} else {
						lastError = new Error(result.error);
						continue;
					}
				} else {
					// Fallback to simple exec if no progress callback
					await execAsync(`${multipassPath} ${command}`);
					return { success: true, instanceName, wasDownloading: false };
				}
			} catch (err) {
				lastError = err;
				continue;
			}
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
