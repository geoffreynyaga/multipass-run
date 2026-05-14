import * as vscode from 'vscode';
import { MultipassService } from '../multipassService';
import type { SSHSetupStep } from '../utils/sshConfig';
import { SSH_SETUP_MAX_POLL_ATTEMPTS, SSH_SETUP_POLL_INTERVAL_MS } from '../config/timings';

const STEP_LABELS: Record<SSHSetupStep, string> = {
	'keypair':      'Generating SSH key pair...',
	'multipass':    'Locating multipass...',
	'guest-dir':    'Creating ~/.ssh on guest...',
	'read-keys':    'Reading guest authorized_keys...',
	'install-key':  'Installing public key on guest...',
	'write-config': 'Writing ~/.ssh/config entry...',
	'probe':        'Probing SSH connection...',
};

/**
 * Setup SSH connection for an instance
 * Checks for Remote-SSH extension, waits for instance to be ready, and configures SSH
 */
export async function setupSSHConnection(
	instanceName: string,
	opts?: { onCancel?: () => void },
): Promise<void> {
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
				// Open the extension page so the user can watch install progress
				// and reload from there once it's done.
				await vscode.commands.executeCommand('extension.open', 'ms-vscode-remote.remote-ssh');
				vscode.window.showInformationMessage('Reload VS Code after Remote-SSH finishes installing, then try again.');
			}
			return;
		}

		// Wait for instance to be running and get its IP. Polling starts AFTER
		// `multipass launch` returns, so it covers the state-propagation window
		// (running flag + IP assignment), not the image download. Tunable via
		// config/timings.ts: SSH_SETUP_POLL_INTERVAL_MS / SSH_SETUP_MAX_POLL_ATTEMPTS.
		let attempts = 0;
		const maxAttempts = SSH_SETUP_MAX_POLL_ATTEMPTS;
		const pollIntervalMs = SSH_SETUP_POLL_INTERVAL_MS;
		let instanceIP = '';

		vscode.window.showInformationMessage(`Waiting for instance '${instanceName}' to be ready...`);

		while (attempts < maxAttempts) {
			const instances = await MultipassService.getInstances();
			const instance = instances.find(i => i.name === instanceName);

			if (instance && instance.state.toLowerCase() === 'running' && instance.ipv4) {
				instanceIP = instance.ipv4;
				break;
			}

			await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
			attempts++;
		}

		if (!instanceIP) {
			vscode.window.showErrorMessage(
				`Failed to setup SSH: Instance '${instanceName}' did not get an IP address`
			);
			return;
		}

		// Setup SSH configuration with per-step progress. Without these updates
		// the toast sat on "Configuring SSH at IP..." for ~10 min while a hung
		// `multipass exec` waited on cloud-init.
		const sshResult = await vscode.window.withProgress(
			{
				location: vscode.ProgressLocation.Notification,
				title: `Setting up SSH for '${instanceName}'`,
				cancellable: false
			},
			async (progress) => {
				progress.report({ message: `Reached ${instanceIP}, starting setup...` });
				return await MultipassService.setupSSHForInstance(instanceName, instanceIP, (step) => {
					progress.report({ message: STEP_LABELS[step] });
				});
			}
		);

		if (sshResult.success) {
			const sshHostName = `multipass-${instanceName}`;

			// Show success message with options
			const selection = await vscode.window.showInformationMessage(
				`SSH configured successfully for '${instanceName}'!\n\nYou can now connect using Remote-SSH with host: ${sshHostName}`,
				{ modal: true },
				'Connect now',
				'Open Remote-SSH View',
				'Cancel'
			);

			if (selection === 'Connect now') {
				await MultipassService.connectToInstanceViaSSH(instanceName);
			} else if (selection === 'Open Remote-SSH View') {
				await MultipassService.openRemoteSSHView();
			} else {
				// Cancel or Esc — notify caller so it can redirect focus
				opts?.onCancel?.();
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
