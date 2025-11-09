import * as vscode from 'vscode';

import { findImages } from '../findImages';
import { instanceNameExists } from './instanceNameExists';
import { launchInstance } from './launchInstance';
import { promptSSHOption } from './promptSSHOption';

export interface DetailedInstanceConfig {
	name: string;
	image: string;
	imageRelease: string;
	cpus: string;
	memory: string;
	disk: string;
	enableSSH: boolean;
}

export async function createDetailedInstance(): Promise<DetailedInstanceConfig | undefined> {
	// Step 1: Instance Name
	const instanceName = await vscode.window.showInputBox({
		prompt: 'Step 1/5: Enter instance name',
		placeHolder: 'my-instance',
		validateInput: async (value) => {
			if (!value || value.trim() === '') {
				return 'Instance name cannot be empty';
			}
			if (!/^[a-zA-Z][a-zA-Z0-9-]*[a-zA-Z0-9]$/.test(value)) {
				return 'Name must start with a letter and end with alphanumeric character';
			}
			// Check if instance name already exists
			const exists = await instanceNameExists(value);
			if (exists) {
				return `Instance '${value}' already exists. Please choose a different name.`;
			}
			return null;
		}
	});

	if (!instanceName) {
		return undefined; // User cancelled
	}

	// Step 2: Image Selection
	const imagesResult = await findImages();

	if (!imagesResult) {
		vscode.window.showErrorMessage('Failed to fetch available images');
		return undefined;
	}

	// Prepare quick pick items for images
	interface ImageQuickPickItem extends vscode.QuickPickItem {
		imageKey: string;
	}

	const imageItems: ImageQuickPickItem[] = [];

	// Add Ubuntu LTS images first (most common)
	const ltsImages = Object.entries(imagesResult.images)
		.filter(([_, image]) => image.release.includes('LTS'))
		.sort((a, b) => b[0].localeCompare(a[0])); // Newest first

	for (const [key, image] of ltsImages) {
		const label = `${image.os} ${image.release}`;
		const description = image.aliases.length > 0 ? `(${image.aliases.join(', ')})` : '';
		const detail = `Version: ${image.version}`;

		imageItems.push({
			label,
			description,
			detail,
			picked: key === '24.04', // Default to latest LTS
			alwaysShow: true,
			imageKey: key
		});
	}

	// Add other Ubuntu images
	const otherImages = Object.entries(imagesResult.images)
		.filter(([_, image]) => !image.release.includes('LTS'))
		.sort((a, b) => b[0].localeCompare(a[0])); // Newest first

	if (otherImages.length > 0) {
		imageItems.push({
			label: '',
			kind: vscode.QuickPickItemKind.Separator,
			imageKey: ''
		});

		for (const [key, image] of otherImages) {
			const label = `${image.os} ${image.release}`;
			const description = image.aliases.length > 0 ? `(${image.aliases.join(', ')})` : '';
			const detail = `Version: ${image.version}${image.remote ? ` • Remote: ${image.remote}` : ''}`;

			imageItems.push({
				label,
				description,
				detail,
				imageKey: key
			});
		}
	}	// Show image selection
	const selectedImage = await vscode.window.showQuickPick(imageItems, {
		placeHolder: 'Step 2/5: Select an image',
		title: 'Choose Image for Instance',
		matchOnDescription: true,
		matchOnDetail: true
	});

	if (!selectedImage) {
		return undefined;
	}

	// Extract the image key and release
	const imageKey = selectedImage.imageKey;
	const selectedImageData = imagesResult.images[imageKey];

	if (!selectedImageData) {
		vscode.window.showErrorMessage(`Failed to get image data for key: ${imageKey}`);
		return undefined;
	}

	// Step 3: CPUs
	const cpusInput = await vscode.window.showInputBox({
		prompt: 'Step 3/5: Number of CPUs',
		placeHolder: '1',
		value: '1',
		validateInput: (value) => {
			const num = parseInt(value);
			if (isNaN(num) || num < 1) {
				return 'Must be a positive integer (minimum: 1)';
			}
			return null;
		}
	});

	if (!cpusInput) {
		return undefined; // User cancelled
	}

	// Step 4: Memory
	const memoryInput = await vscode.window.showInputBox({
		prompt: 'Step 4/5: Memory size (e.g., 1G, 512M, 2048M)',
		placeHolder: '1G',
		value: '1G',
		validateInput: (value) => {
			if (!/^\d+(\.\d+)?[KMG]$/.test(value)) {
				return 'Format: number with K, M, or G suffix (e.g., 1G, 512M)';
			}
			// Validate minimum of 128M
			const match = value.match(/^(\d+(?:\.\d+)?)([KMG])$/);
			if (match) {
				const amount = parseFloat(match[1]);
				const unit = match[2];
				const bytes = unit === 'G' ? amount * 1024 * 1024 * 1024 :
				             unit === 'M' ? amount * 1024 * 1024 :
				             amount * 1024;
				if (bytes < 128 * 1024 * 1024) {
					return 'Minimum memory: 128M';
				}
			}
			return null;
		}
	});

	if (!memoryInput) {
		return undefined; // User cancelled
	}

	// Step 5: Disk
	const diskInput = await vscode.window.showInputBox({
		prompt: 'Step 5/5: Disk size (e.g., 5G, 10G, 2048M)',
		placeHolder: '5G',
		value: '5G',
		validateInput: (value) => {
			if (!/^\d+(\.\d+)?[KMG]$/.test(value)) {
				return 'Format: number with K, M, or G suffix (e.g., 5G, 2048M)';
			}
			// Validate minimum of 512M
			const match = value.match(/^(\d+(?:\.\d+)?)([KMG])$/);
			if (match) {
				const amount = parseFloat(match[1]);
				const unit = match[2];
				const bytes = unit === 'G' ? amount * 1024 * 1024 * 1024 :
				             unit === 'M' ? amount * 1024 * 1024 :
				             amount * 1024;
				if (bytes < 512 * 1024 * 1024) {
					return 'Minimum disk: 512M';
				}
			}
			return null;
		}
	});

	if (!diskInput) {
		return undefined; // User cancelled
	}

	// Ask if user wants to enable Remote SSH connection
	const enableRemoteSSH = await promptSSHOption();

	if (enableRemoteSSH === undefined) {
		return undefined; // User cancelled
	}

	// Show confirmation
	const sshInfo = enableRemoteSSH ? '\nRemote SSH: Enabled' : '\nRemote SSH: Disabled';
	const fullReleaseName = `${selectedImageData.os} ${selectedImageData.release}`;
	const confirm = await vscode.window.showInformationMessage(
		`Create instance with:\nName: ${instanceName}\nImage: ${fullReleaseName}\nCPUs: ${cpusInput}\nMemory: ${memoryInput}\nDisk: ${diskInput}${sshInfo}`,
		{ modal: true },
		'Create'
	);

	if (confirm !== 'Create') {
		return undefined;
	}

	// Return the configuration - the handler will do the optimistic update and launch
	return {
		name: instanceName,
		image: imageKey,
		imageRelease: `${selectedImageData.os} ${selectedImageData.release}`,
		cpus: cpusInput,
		memory: memoryInput,
		disk: diskInput,
		enableSSH: enableRemoteSSH
	};
}
