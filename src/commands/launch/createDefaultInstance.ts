import * as vscode from 'vscode';

import { launchInstance } from './launchInstance';

export async function createDefaultInstance(): Promise<string | undefined> {
	// Prompt user for instance name
	const instanceName = await vscode.window.showInputBox({
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

	// Show progress
	await vscode.window.withProgress(
		{
			location: vscode.ProgressLocation.Notification,
			title: `Creating instance '${instanceName}'`,
			cancellable: false
		},
		async (progress) => {
			progress.report({ increment: 0, message: 'Launching...' });

			const result = await launchInstance(instanceName);
			if (result.success) {
				progress.report({ increment: 50, message: 'Instance created, waiting for it to start...' });
			} else {
				vscode.window.showErrorMessage(`Failed to create instance: ${result.error}`);
			}
			return Promise.resolve();
		}
	);

	return instanceName;
}
