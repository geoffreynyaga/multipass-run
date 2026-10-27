import * as vscode from 'vscode';

import { CUSTOM_INSTANCE_DEFAULTS } from '../../shared/constants';
import { findImages } from '../../utils/multipassFind';
import { buildImageOptions } from '../../utils/multipassImages';
import { instanceNameExists } from './instanceNameExists';
import { promptSSHOption } from './promptSSHOption';
import { validateCpus, validateDisk, validateInstanceName, validateMemory } from './validation';

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
			const nameError = validateInstanceName(value);
			if (nameError) {
				return nameError;
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

	const imageOptions = buildImageOptions(imagesResult.images, 'ubuntu');
	const firstOtherImageIndex = imageOptions.findIndex((image) => !image.isLts);
	const imageItems: ImageQuickPickItem[] = imageOptions.flatMap((image, index) => {
		const item: ImageQuickPickItem = {
			label: image.label,
			description: image.description ?? '',
			detail: image.detail,
			picked: image.imageKey === '24.04',
			alwaysShow: image.isLts,
			imageKey: image.imageKey
		};
		if (index === firstOtherImageIndex) {
			return [{
				label: '',
				kind: vscode.QuickPickItemKind.Separator,
				imageKey: ''
			}, item];
		}
		return [item];
	});

	// Show image selection
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
		placeHolder: CUSTOM_INSTANCE_DEFAULTS.cpus,
		value: CUSTOM_INSTANCE_DEFAULTS.cpus,
		validateInput: (value) => validateCpus(value) ?? null
	});

	if (!cpusInput) {
		return undefined; // User cancelled
	}

	// Step 4: Memory
	const memoryInput = await vscode.window.showInputBox({
		prompt: `Step 4/5: Memory size (e.g., ${CUSTOM_INSTANCE_DEFAULTS.memory}, 512M, 2048M)`,
		placeHolder: CUSTOM_INSTANCE_DEFAULTS.memory,
		value: CUSTOM_INSTANCE_DEFAULTS.memory,
		validateInput: (value) => validateMemory(value) ?? null
	});

	if (!memoryInput) {
		return undefined; // User cancelled
	}

	// Step 5: Disk
	const diskInput = await vscode.window.showInputBox({
		prompt: `Step 5/5: Disk size (e.g., ${CUSTOM_INSTANCE_DEFAULTS.disk}, 2048M)`,
		placeHolder: CUSTOM_INSTANCE_DEFAULTS.disk,
		value: CUSTOM_INSTANCE_DEFAULTS.disk,
		validateInput: (value) => validateDisk(value) ?? null
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
