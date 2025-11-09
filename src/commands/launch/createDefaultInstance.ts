import * as vscode from 'vscode';

import { findImages } from '../findImages';
import { launchInstance } from './launchInstance';

export interface CreateInstanceCallbacks {
	onInstanceNameSelected?: (name: string) => void;
	onImageSelected?: (imageName: string, imageRelease: string) => void;
	onLaunchStarted?: () => void;
}

export async function createDefaultInstance(
	instanceName?: string,
	callbacks?: CreateInstanceCallbacks
): Promise<string | undefined> {
	// If instance name not provided, prompt user for it
	if (!instanceName) {
		instanceName = await vscode.window.showInputBox({
			prompt: 'Enter a name for the new instance',
			placeHolder: 'my-instance',
			validateInput: (value) => {
				if (!value || value.trim() === '') {
					return 'Instance name cannot be empty';
				}
				if (!/^[a-zA-Z0-9-_]+$/.test(value)) {
					return 'Instance name can only contain letters, numbers, hyphens, and underscores';
				}
				return null;
			}
		});

		if (!instanceName) {
			return undefined;
		}
	}

	// Notify that instance name was selected
	callbacks?.onInstanceNameSelected?.(instanceName);

	// Fetch available images
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
		const label = `Ubuntu ${image.release}`;
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
			const label = `Ubuntu ${image.release}`;
			const description = image.aliases.length > 0 ? `(${image.aliases.join(', ')})` : '';
			const detail = `Version: ${image.version}${image.remote ? ` • Remote: ${image.remote}` : ''}`;

			imageItems.push({
				label,
				description,
				detail,
				imageKey: key
			});
		}
	}

	// Show image selection
	const selectedImage = await vscode.window.showQuickPick(imageItems, {
		placeHolder: 'Select an Ubuntu image',
		title: 'Choose Image for Instance',
		matchOnDescription: true,
		matchOnDetail: true
	});

	if (!selectedImage) {
		return undefined;
	}

	// Extract the image key
	const imageKey = selectedImage.imageKey;
	const selectedImageData = imagesResult.images[imageKey];

	// Notify that image was selected
	if (selectedImageData) {
		callbacks?.onImageSelected?.(imageKey, selectedImageData.release);
	}

	// Notify that launch is starting
	callbacks?.onLaunchStarted?.();

	// Launch the instance with progress feedback
	const result = await vscode.window.withProgress(
		{
			location: vscode.ProgressLocation.Notification,
			title: `Creating instance '${instanceName}'`,
			cancellable: false
		},
		async (progress) => {
			let isDownloading = false;

			const launchResult = await launchInstance({
				name: instanceName,
				image: imageKey,
				onProgress: (message, downloading) => {
					if (downloading && !isDownloading) {
						// First time we detect downloading
						isDownloading = true;
						progress.report({
							message: 'Downloading image... This may take a few minutes depending on your internet speed.'
						});
					} else if (downloading) {
						// Update download progress
						progress.report({ message });
					} else if (isDownloading && !downloading) {
						// Switched from downloading to creating
						progress.report({ message: 'Image downloaded. Creating instance...' });
					} else {
						// Just creating
						progress.report({ message });
					}
				}
			});

			return launchResult;
		}
	);

	if (!result.success) {
		vscode.window.showErrorMessage(`Failed to create instance '${instanceName}': ${result.error}`);
		return undefined;
	}

	// Show appropriate success message
	if (result.wasDownloading) {
		vscode.window.showInformationMessage(
			`Instance '${instanceName}' created successfully! Image was downloaded and cached for future use.`
		);
	} else {
		vscode.window.showInformationMessage(`Instance '${instanceName}' created successfully!`);
	}

	return instanceName;
}
