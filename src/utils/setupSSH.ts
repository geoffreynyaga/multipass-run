import * as vscode from 'vscode';

import { getInstances } from '../commands/listInstances';
import { setupSSHForInstance } from './sshConfig';

/**
 * Command to set up SSH for an existing instance
 */
export async function setupSSH(instanceName?: string): Promise<void> {
	try {
		// If no instance name provided, ask user to select one
		if (!instanceName) {
			const instances = await getInstances();
			const runningInstances = instances.filter((i) => i.state.toLowerCase() === 'running');

			if (runningInstances.length === 0) {
				vscode.window.showInformationMessage('No running instances found. Please start an instance first.');
				return;
			}

			interface InstanceQuickPickItem extends vscode.QuickPickItem {
				instanceName: string;
			}

			const items: InstanceQuickPickItem[] = runningInstances.map((inst) => ({
				label: inst.name,
				description: `${inst.state} - ${inst.ipv4}`,
				detail: `${inst.release}`,
				instanceName: inst.name
			}));

			const selected = await vscode.window.showQuickPick(items, {
				placeHolder: 'Select an instance to set up SSH for'
			});

			if (!selected) {
				return;
			}

			instanceName = selected.instanceName;
		}

		// Get instance info to get IP
		const instances = await getInstances();
		const instance = instances.find((i) => i.name === instanceName);

		if (!instance) {
			vscode.window.showErrorMessage(`Instance '${instanceName}' not found`);
			return;
		}

		if (instance.state.toLowerCase() !== 'running') {
			vscode.window.showErrorMessage(`Instance '${instanceName}' is not running. Please start it first.`);
			return;
		}

		if (!instance.ipv4 || instance.ipv4 === '--') {
			vscode.window.showErrorMessage(`Instance '${instanceName}' does not have an IP address`);
			return;
		}

		// Show progress while setting up SSH
		const result = await vscode.window.withProgress(
			{
				location: vscode.ProgressLocation.Notification,
				title: `Setting up SSH for '${instanceName}'`,
				cancellable: false
			},
			async (progress) => {
				progress.report({ message: 'Generating SSH keys...' });
				return await setupSSHForInstance(instanceName!, instance.ipv4);
			}
		);

		if (result.success) {
			const sshHostName = `multipass-${instanceName}`;
			vscode.window.showInformationMessage(
				`SSH configured successfully for '${instanceName}'!\n\nHost name: ${sshHostName}`,
				'Open in Remote-SSH'
			).then(selection => {
				if (selection === 'Open in Remote-SSH') {
					vscode.commands.executeCommand('opensshremotes.focus');
				}
			});
		} else {
			vscode.window.showErrorMessage(`Failed to set up SSH: ${result.error}`);
		}
	} catch (error: any) {
		vscode.window.showErrorMessage(`Error setting up SSH: ${error.message}`);
	}
}
