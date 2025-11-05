import * as vscode from 'vscode';

import { launchInstance } from './launchInstance';

export async function createDefaultInstance(instanceName?: string): Promise<string | undefined> {
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

	// Launch the instance without blocking progress notification
	const result = await launchInstance(instanceName);
	if (!result.success) {
		vscode.window.showErrorMessage(`Failed to create instance '${instanceName}': ${result.error}`);
		return undefined;
	}

	return instanceName;
}
