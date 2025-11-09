import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';

import { MULTIPASS_PATHS } from './constants';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface SSHSetupResult {
	success: boolean;
	error?: string;
}

/**
 * Sets up SSH access for a Multipass instance and adds it to SSH config
 */
export async function setupSSHForInstance(instanceName: string, instanceIP: string): Promise<SSHSetupResult> {
	try {
		const sshDir = path.join(os.homedir(), '.ssh');
		const privateKeyPath = path.join(sshDir, 'multipass_id_rsa');
		const publicKeyPath = path.join(sshDir, 'multipass_id_rsa.pub');
		const sshConfigPath = path.join(sshDir, 'config');

		// Ensure .ssh directory exists
		if (!fs.existsSync(sshDir)) {
			fs.mkdirSync(sshDir, { mode: 0o700 });
		}

		// Generate SSH key pair if it doesn't exist
		if (!fs.existsSync(privateKeyPath)) {
			try {
				await execAsync(`ssh-keygen -t rsa -b 4096 -f "${privateKeyPath}" -N "" -C "multipass-vscode"`);
				// Set proper permissions
				fs.chmodSync(privateKeyPath, 0o600);
				fs.chmodSync(publicKeyPath, 0o644);
			} catch (error: any) {
				return {
					success: false,
					error: `Failed to generate SSH key: ${error.message}`
				};
			}
		}

		// Read the public key
		const publicKey = fs.readFileSync(publicKeyPath, 'utf8').trim();

		// Copy public key to instance's authorized_keys
		let multipassPath = '';
		for (const mp of MULTIPASS_PATHS) {
			try {
				await execAsync(`${mp} version`);
				multipassPath = mp;
				break;
			} catch {
				continue;
			}
		}

		if (!multipassPath) {
			return {
				success: false,
				error: 'Multipass command not found'
			};
		}

		// Ensure .ssh directory exists in instance
		try {
			await execAsync(`${multipassPath} exec ${instanceName} -- bash -c "mkdir -p ~/.ssh && chmod 700 ~/.ssh"`);
		} catch (error: any) {
			return {
				success: false,
				error: `Failed to create .ssh directory in instance: ${error.message}`
			};
		}

		// Add public key to authorized_keys
		try {
			// First, check if the key already exists to avoid duplicates
			const checkKeyCmd = `${multipassPath} exec ${instanceName} -- bash -c "grep -F '${publicKey}' ~/.ssh/authorized_keys 2>/dev/null || echo 'not_found'"`;
			const { stdout: checkResult } = await execAsync(checkKeyCmd);

			if (checkResult.trim() === 'not_found') {
				// Key doesn't exist, add it
				// Use a safer method: write key to a temp file, then transfer it
				const tempKeyFile = path.join(os.tmpdir(), `multipass_key_${Date.now()}.pub`);
				fs.writeFileSync(tempKeyFile, publicKey + '\n', 'utf8');

				// Transfer the key file to the instance
				await execAsync(`${multipassPath} transfer "${tempKeyFile}" ${instanceName}:/tmp/new_key.pub`);

				// Append it to authorized_keys and set proper permissions
				await execAsync(`${multipassPath} exec ${instanceName} -- bash -c "cat /tmp/new_key.pub >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && rm /tmp/new_key.pub"`);

				// Clean up temp file
				fs.unlinkSync(tempKeyFile);

				console.log(`SSH key added to instance '${instanceName}'`);
			} else {
				console.log(`SSH key already exists in instance '${instanceName}'`);
			}
		} catch (error: any) {
			console.error(`Failed to add SSH key to instance: ${error.message}`);
			return {
				success: false,
				error: `Failed to add SSH key to instance: ${error.message}`
			};
		}

		// Add/update SSH config entry
		const sshHostName = `multipass-${instanceName}`;
		const sshConfigEntry = `
# Multipass instance: ${instanceName} (managed by multipass-run extension)
Host ${sshHostName}
  HostName ${instanceIP}
  User ubuntu
  IdentityFile ${privateKeyPath}
  StrictHostKeyChecking no
  UserKnownHostsFile /dev/null
  LogLevel ERROR
`;

		// Read existing SSH config
		let sshConfig = '';
		if (fs.existsSync(sshConfigPath)) {
			sshConfig = fs.readFileSync(sshConfigPath, 'utf8');
		}

		// Remove any existing entry for this instance
		const entryStartMarker = `# Multipass instance: ${instanceName}`;
		const lines = sshConfig.split('\n');
		const filteredLines: string[] = [];
		let skipUntilNextHost = false;

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			if (line.includes(entryStartMarker)) {
				skipUntilNextHost = true;
				continue;
			}
			if (skipUntilNextHost && line.trim().startsWith('Host ') && !line.includes(sshHostName)) {
				skipUntilNextHost = false;
			}
			if (!skipUntilNextHost) {
				filteredLines.push(line);
			}
		}

		// Add new entry at the beginning
		const newConfig = sshConfigEntry + '\n' + filteredLines.join('\n').trim() + '\n';

		console.log(`Writing SSH config to: ${sshConfigPath}`);
		console.log(`SSH config entry:\n${sshConfigEntry}`);

		fs.writeFileSync(sshConfigPath, newConfig, { mode: 0o600 });

		// Verify it was written
		const writtenConfig = fs.readFileSync(sshConfigPath, 'utf8');
		if (writtenConfig.includes(entryStartMarker)) {
			console.log(`✓ SSH config entry successfully written for '${instanceName}'`);
		} else {
			console.error(`✗ SSH config entry was NOT written to file!`);
		}

		console.log(`SSH config entry added for '${instanceName}' as host '${sshHostName}' and '${instanceIP}'`);
		console.log(`SSH config path: ${sshConfigPath}`);
		console.log(`IP Address: ${instanceIP}`);

		// Test the SSH connection to make sure it works
		try {
			console.log('Testing SSH connection...');
			const testCmd = `ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no -i "${privateKeyPath}" ubuntu@${instanceIP} "echo 'SSH connection successful'"`;
			const { stdout: testResult } = await execAsync(testCmd);

			if (testResult.includes('SSH connection successful')) {
				console.log('SSH connection test passed!');
			} else {
				console.warn('SSH connection test returned unexpected output:', testResult);
			}
		} catch (error: any) {
			console.error('SSH connection test failed:', error.message);
			// Don't fail the whole setup, just warn
			console.warn('SSH config was created but connection test failed. The connection might work after a short delay.');
		}

		return { success: true };
	} catch (error: any) {
		console.error(`SSH setup error: ${error.message}`);
		return {
			success: false,
			error: error.message || 'Unknown error during SSH setup'
		};
	}
}

/**
 * Removes SSH config entry for a Multipass instance
 */
export async function removeSSHConfigForInstance(instanceName: string): Promise<void> {
	try {
		const sshConfigPath = path.join(os.homedir(), '.ssh', 'config');

		if (!fs.existsSync(sshConfigPath)) {
			return;
		}

		const sshConfig = fs.readFileSync(sshConfigPath, 'utf8');
		const entryStartMarker = `# Multipass instance: ${instanceName}`;
		const sshHostName = `multipass-${instanceName}`;

		const lines = sshConfig.split('\n');
		const filteredLines: string[] = [];
		let skipUntilNextHost = false;

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			if (line.includes(entryStartMarker)) {
				skipUntilNextHost = true;
				continue;
			}
			if (skipUntilNextHost && line.trim().startsWith('Host ') && !line.includes(sshHostName)) {
				skipUntilNextHost = false;
			}
			if (!skipUntilNextHost) {
				filteredLines.push(line);
			}
		}

		fs.writeFileSync(sshConfigPath, filteredLines.join('\n').trim() + '\n', { mode: 0o600 });
	} catch (error) {
		console.error('Error removing SSH config entry:', error);
	}
}

/**
 * Opens an instance in VS Code Remote SSH
 */
export async function connectToInstanceViaSSH(instanceName: string): Promise<void> {
	const sshHostName = `multipass-${instanceName}`;

	try {
		console.log(`Attempting to connect to SSH host: ${sshHostName}`);

		// First, reload the SSH config to make sure Remote-SSH sees our changes
		try {
			await vscode.commands.executeCommand('remote-ssh.configureHostsFile');
			console.log('Triggered SSH config reload');
			// Give it a moment to process
			await new Promise(resolve => setTimeout(resolve, 500));
		} catch (reloadError) {
			console.warn('Could not reload SSH config:', reloadError);
			// Continue anyway
		}

		// Try to connect using Remote-SSH: Connect to Host command
		// This opens a new window connected to the host
		await vscode.commands.executeCommand('remote-ssh.connectToHost', sshHostName);
		console.log('Successfully triggered remote-ssh.connectToHost command');
	} catch (error: any) {
		console.error(`remote-ssh.connectToHost failed: ${error.message}`);

		// Fallback: try opening with SSH URI in a new window
		try {
			console.log('Trying fallback: vscode.openFolder with SSH URI');
			await vscode.commands.executeCommand(
				'vscode.openFolder',
				vscode.Uri.parse(`vscode-remote://ssh-remote+${sshHostName}/home/ubuntu`),
				{ forceNewWindow: true }
			);
			console.log('Successfully opened SSH connection with URI');
		} catch (uriError: any) {
			console.error(`SSH URI connection failed: ${uriError.message}`);

			// Final fallback: try using the Remote Explorer command
			try {
				console.log('Trying final fallback: remote.newWindow');
				await vscode.commands.executeCommand('remote.newWindow', {
					authority: `ssh-remote+${sshHostName}`
				});
			} catch (fallbackError: any) {
				console.error(`All connection attempts failed: ${fallbackError.message}`);
				vscode.window.showErrorMessage(
					`Failed to connect via Remote-SSH: ${error.message}\n\nPlease try connecting manually from the Remote-SSH extension panel using host: ${sshHostName}`
				);
			}
		}
	}
}
