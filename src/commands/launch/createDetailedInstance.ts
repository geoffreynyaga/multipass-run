import * as vscode from 'vscode';

import { launchInstance } from './launchInstance';

export interface DetailedInstanceConfig {
	name: string;
	cpus: string;
	memory: string;
	disk: string;
}

export async function createDetailedInstance(): Promise<DetailedInstanceConfig | undefined> {
	// Step 1: Instance Name
	const instanceName = await vscode.window.showInputBox({
		prompt: 'Step 1/4: Enter instance name',
		placeHolder: 'my-instance',
		validateInput: (value) => {
			if (!value || value.trim() === '') {
				return 'Instance name cannot be empty';
			}
			if (!/^[a-zA-Z][a-zA-Z0-9-]*[a-zA-Z0-9]$/.test(value)) {
				return 'Name must start with a letter and end with alphanumeric character';
			}
			return null;
		}
	});

	if (!instanceName) {
		return undefined; // User cancelled
	}

	// Step 2: CPUs
	const cpusInput = await vscode.window.showInputBox({
		prompt: 'Step 2/4: Number of CPUs',
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

	// Step 3: Memory
	const memoryInput = await vscode.window.showInputBox({
		prompt: 'Step 3/4: Memory size (e.g., 1G, 512M, 2048M)',
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

	// Step 4: Disk
	const diskInput = await vscode.window.showInputBox({
		prompt: 'Step 4/4: Disk size (e.g., 5G, 10G, 2048M)',
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

	// Show confirmation
	const confirm = await vscode.window.showInformationMessage(
		`Create instance with:\nName: ${instanceName}\nCPUs: ${cpusInput}\nMemory: ${memoryInput}\nDisk: ${diskInput}`,
		{ modal: true },
		'Create'
	);

	if (confirm !== 'Create') {
		return undefined;
	}

	// Create instance with specified parameters
	await vscode.window.withProgress(
		{
			location: vscode.ProgressLocation.Notification,
			title: `Creating instance '${instanceName}'`,
			cancellable: false
		},
		async (progress) => {
			progress.report({ increment: 0, message: 'Launching with custom configuration...' });

			const result = await launchInstance({
				name: instanceName,
				cpus: cpusInput,
				memory: memoryInput,
				disk: diskInput
			});

			if (result.success) {
				progress.report({ increment: 50, message: 'Instance created, waiting for it to start...' });
			} else {
				vscode.window.showErrorMessage(`Failed to create instance: ${result.error}`);
			}
			return Promise.resolve();
		}
	);

	return {
		name: instanceName,
		cpus: cpusInput,
		memory: memoryInput,
		disk: diskInput
	};
}
