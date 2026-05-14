import * as vscode from 'vscode';

import { createDefaultInstance, createDetailedInstance, launchInstance,MultipassService } from '../multipassService';
import { PendingLaunchStore } from './pendingLaunches';
import { setupSSHConnection } from './sshSetup';

/**
 * Handle creating a new instance with default settings
 * Returns the instance name if successful, undefined if cancelled or failed
 */
export async function handleCreateDefaultInstance(
	view: vscode.WebviewView | undefined,
	pendingStore: PendingLaunchStore,
	onComplete: (instanceName: string) => void
): Promise<void> {
	let instanceName: string | undefined;
	let imageRelease: string | undefined;
	let enableSSH = false;
	let pendingRecorded = false;

	// createDefaultInstance now handles name prompt, image selection, and progress feedback
	const result = await createDefaultInstance(undefined, {
		onInstanceNameSelected: (name) => {
			instanceName = name;
		},
		onImageSelected: (imageName, release) => {
			imageRelease = release;
		},
		onSSHEnabled: (enabled) => {
			enableSSH = enabled;
		},
		onLaunchStarted: async () => {
			if (instanceName) {
				await pendingStore.add({
					name: instanceName,
					release: imageRelease,
					startedAt: Date.now(),
					status: 'launching',
				});
				pendingRecorded = true;
			}

			// Check if image is already downloaded to show appropriate state
			if (view && instanceName && imageRelease) {
				const currentLists = await MultipassService.getInstanceLists();
				const isImageCached = await MultipassService.isImageAlreadyDownloaded(imageRelease);

				const newInstance = {
					name: instanceName,
					state: isImageCached ? 'Creating' : 'Downloading Image',
					ipv4: '',
					release: imageRelease // Already includes OS name (e.g., "Fedora 43", "Ubuntu 24.04 LTS")
				};
				currentLists.active.push(newInstance);
				view.webview.postMessage({
					command: 'updateInstances',
					instanceLists: currentLists
				});
			}
		}
	});

	if (result) {
		// Instance was created successfully
		console.log('Instance created, checking SSH setup...', result);

		if (pendingRecorded && instanceName) {
			await pendingStore.remove(instanceName);
		}

		// If SSH is enabled, set it up (don't wait for polling)
		if (result.enableSSH) {
			console.log(`SSH is enabled for ${result.instanceName}, setting up...`);
			// Run SSH setup in background while polling happens
			setupSSHConnection(result.instanceName).catch(err => {
				console.error('SSH setup failed:', err);
			});
		} else {
			console.log('SSH is not enabled for this instance');
		}

		// Call the completion callback with the instance name
		onComplete(result.instanceName);
	} else {
		// Creation was cancelled or failed
		console.log('Instance creation was cancelled or failed');
		if (pendingRecorded && instanceName) {
			await pendingStore.remove(instanceName);
		}
	}
}

/**
 * Handle creating a new instance with detailed/custom settings
 * Returns the instance name if successful, undefined if cancelled or failed
 */
export async function handleCreateDetailedInstance(
	view: vscode.WebviewView | undefined,
	pendingStore: PendingLaunchStore,
	onComplete: (instanceName: string, enableSSH: boolean) => void
): Promise<void> {
	const config = await createDetailedInstance();
	if (!config) {
		return;
	}

	await pendingStore.add({
		name: config.name,
		release: config.imageRelease,
		startedAt: Date.now(),
		status: 'launching',
		config: {
			cpus: config.cpus,
			memory: config.memory,
			disk: config.disk,
			image: config.image,
		},
	});

	// Check if image is already downloaded to show appropriate state
	if (view) {
		const currentLists = await MultipassService.getInstanceLists();
		const isImageCached = await MultipassService.isImageAlreadyDownloaded(config.imageRelease);

		const newInstance = {
			name: config.name,
			state: isImageCached ? 'Creating' : 'Downloading Image',
			ipv4: '',
			release: config.imageRelease // Already includes OS name (e.g., "Fedora 43", "Ubuntu 24.04 LTS")
		};
		currentLists.active.push(newInstance);
		view.webview.postMessage({
			command: 'updateInstances',
			instanceLists: currentLists
		});
	}

	// Launch the instance with the custom configuration and progress tracking
	const result = await vscode.window.withProgress(
		{
			location: vscode.ProgressLocation.Notification,
			title: `Creating ${config.name}`,
			cancellable: false
		},
		async (progress) => {
			return await launchInstance({
				name: config.name,
				cpus: config.cpus,
				memory: config.memory,
				disk: config.disk,
				image: config.image,
				onProgress: (message) => {
					progress.report({ message });
				}
			});
		}
	);

	if (result.success) {
		console.log('Detailed instance created, checking SSH setup...', config);
		await pendingStore.remove(config.name);

		// If SSH is enabled, set it up (don't wait for polling)
		if (config.enableSSH) {
			console.log(`SSH is enabled for ${config.name}, setting up...`);
			// Run SSH setup in background while polling happens
			setupSSHConnection(config.name).catch(err => {
				console.error('SSH setup failed:', err);
			});
		} else {
			console.log('SSH is not enabled for this instance');
		}

		// Call the completion callback with the instance name and SSH setting
		onComplete(config.name, config.enableSSH);
	} else {
		// If creation failed, show error
		await pendingStore.remove(config.name);
		vscode.window.showErrorMessage(`Failed to create instance: ${result.error}`);
	}
}
