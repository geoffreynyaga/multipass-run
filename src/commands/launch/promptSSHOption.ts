import * as vscode from 'vscode';

/**
 * Prompts the user to enable or disable Remote SSH integration
 * @returns true if enabled, false if disabled, undefined if cancelled
 */
export async function promptSSHOption(): Promise<boolean | undefined> {
	const enableSSH = await vscode.window.showQuickPick(
		[
			{ label: 'No', description: 'Create instance without VSCode Remote SSH integration', value: false },
			{ label: 'Yes', description: 'Setup SSH and add to VSCode Remote SSH extension', value: true }
		],
		{
			placeHolder: 'Enable VS Code Remote SSH integration?',
			title: 'Remote SSH Setup'
		}
	);

	if (!enableSSH) {
		return undefined; // User cancelled
	}

	return enableSSH.value;
}
