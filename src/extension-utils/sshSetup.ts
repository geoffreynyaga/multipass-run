import * as vscode from 'vscode';
import { MultipassService } from '../multipassService';

/**
 * Setup SSH connection for an instance
 * Checks for Remote-SSH extension, waits for instance to be ready, and configures SSH
 */
export async function setupSSHConnection(instanceName: string): Promise<void> {
	try {
		// Check if Remote-SSH extension is installed
		const remoteSSHExtension = vscode.extensions.getExtension('ms-vscode-remote.remote-ssh');
		if (!remoteSSHExtension) {
			const install = await vscode.window.showWarningMessage(
				'Remote-SSH extension is not installed. Would you like to install it?',
				'Install',
				'Cancel'
			);
			if (install === 'Install') {
				await vscode.commands.executeCommand('workbench.extensions.installExtension', 'ms-vscode-remote.remote-ssh');
				vscode.window.showInformationMessage('Please reload VS Code after the extension installs, then try again.');
			}
			return;
		}

		// Wait for instance to be running and get its IP
		let attempts = 0;
		const maxAttempts = 30;
		let instanceIP = '';

		vscode.window.showInformationMessage(`Waiting for instance '${instanceName}' to be ready...`);

		while (attempts < maxAttempts) {
			const instances = await MultipassService.getInstances();
			const instance = instances.find(i => i.name === instanceName);

			if (instance && instance.state.toLowerCase() === 'running' && instance.ipv4) {
				instanceIP = instance.ipv4;
				break;
			}

			await new Promise(resolve => setTimeout(resolve, 2000));
			attempts++;
		}

		if (!instanceIP) {
			vscode.window.showErrorMessage(
				`Failed to setup SSH: Instance '${instanceName}' did not get an IP address`
			);
			return;
		}

		// Setup SSH configuration with progress
		const sshResult = await vscode.window.withProgress(
			{
				location: vscode.ProgressLocation.Notification,
				title: `Setting up SSH for '${instanceName}'`,
				cancellable: false
			},
			async (progress) => {
				progress.report({ message: `Configuring SSH at ${instanceIP}...` });
				return await MultipassService.setupSSHForInstance(instanceName, instanceIP);
			}
		);

		if (sshResult.success) {
			const sshKeyPath = require('path').join(
				require('os').homedir(),
				'.ssh',
				'multipass_id_rsa'
			);
			const sshCommand = `ssh ubuntu@${instanceIP} -i ${sshKeyPath}`;
			const sshHostName = `multipass-${instanceName}`;

			// Show success message with options
			const selection = await vscode.window.showInformationMessage(
				`SSH configured successfully for '${instanceName}'!\n\nYou can now connect using Remote-SSH with host: ${sshHostName}`,
				{ modal: true },
				'Connect Now',
				'Show in Remote-SSH'
			);

			if (selection === 'Connect Now') {
				await MultipassService.connectToInstanceViaSSH(instanceName);
			} else if (selection === 'Show in Remote-SSH') {
				// Open Remote-SSH extension view
				await vscode.commands.executeCommand('opensshremotes.focus');
			}
		} else {
			vscode.window.showErrorMessage(
				`Failed to setup SSH for '${instanceName}': ${sshResult.error}`
			);
		}
	} catch (error: any) {
		vscode.window.showErrorMessage(
			`Error setting up SSH: ${error.message}`
		);
	}
}
