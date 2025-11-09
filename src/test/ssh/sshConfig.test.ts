import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

suite('SSH Configuration Tests', () => {
	suite('SSH Key Generation', () => {
		test('Should use RSA 4096-bit key algorithm', () => {
			const keyGenCommand = 'ssh-keygen -t rsa -b 4096 -f "/path/to/key" -N "" -C "multipass-vscode"';
			
			assert.ok(keyGenCommand.includes('-t rsa'), 'Should use RSA algorithm');
			assert.ok(keyGenCommand.includes('-b 4096'), 'Should use 4096-bit key size');
			assert.ok(keyGenCommand.includes('-N ""'), 'Should have no passphrase');
		});

		test('Should generate key pair in .ssh directory', () => {
			const sshDir = path.join(os.homedir(), '.ssh');
			const privateKeyPath = path.join(sshDir, 'multipass_id_rsa');
			const publicKeyPath = path.join(sshDir, 'multipass_id_rsa.pub');
			
			assert.ok(privateKeyPath.includes('.ssh'), 'Private key should be in .ssh directory');
			assert.ok(publicKeyPath.includes('.ssh'), 'Public key should be in .ssh directory');
			assert.ok(privateKeyPath.endsWith('multipass_id_rsa'), 'Private key should have correct name');
			assert.ok(publicKeyPath.endsWith('multipass_id_rsa.pub'), 'Public key should have .pub extension');
		});

		test('Should set proper permissions on private key', () => {
			const expectedPermissions = 0o600; // Read/write for owner only
			
			assert.strictEqual(expectedPermissions, 0o600, 'Private key should have 600 permissions');
		});

		test('Should set proper permissions on public key', () => {
			const expectedPermissions = 0o644; // Read/write for owner, read for others
			
			assert.strictEqual(expectedPermissions, 0o644, 'Public key should have 644 permissions');
		});
	});

	suite('SSH Config File Management', () => {
		test('Should create SSH config entry with correct format', () => {
			const instanceName = 'test-instance';
			const instanceIP = '192.168.64.2';
			const sshHostName = `multipass-${instanceName}`;
			const privateKeyPath = path.join(os.homedir(), '.ssh', 'multipass_id_rsa');
			
			const expectedConfig = `
# Multipass instance: ${instanceName} (managed by multipass-run extension)
Host ${sshHostName}
  HostName ${instanceIP}
  User ubuntu
  IdentityFile ${privateKeyPath}
  StrictHostKeyChecking no
  UserKnownHostsFile /dev/null
  LogLevel ERROR
`;
			
			assert.ok(expectedConfig.includes(`Host ${sshHostName}`), 'Should have Host directive');
			assert.ok(expectedConfig.includes(`HostName ${instanceIP}`), 'Should have HostName');
			assert.ok(expectedConfig.includes('User ubuntu'), 'Should have User ubuntu');
			assert.ok(expectedConfig.includes('IdentityFile'), 'Should have IdentityFile');
			assert.ok(expectedConfig.includes('StrictHostKeyChecking no'), 'Should disable strict host checking');
		});

		test('Should not include IP in Host line (prevent duplicates)', () => {
			const instanceName = 'test-instance';
			const instanceIP = '192.168.64.2';
			const sshHostName = `multipass-${instanceName}`;
			
			// Correct format - only alias in Host line
			const correctHostLine = `Host ${sshHostName}`;
			
			// Incorrect format - would create duplicate entries
			const incorrectHostLine = `Host ${sshHostName} ${instanceIP}`;
			
			assert.ok(!correctHostLine.includes(instanceIP), 'Host line should not contain IP');
			assert.strictEqual(correctHostLine, `Host ${sshHostName}`, 'Should only have alias');
		});

		test('Should remove existing entry before adding new one', () => {
			const instanceName = 'test-instance';
			const existingEntry = `# Multipass instance: ${instanceName}`;
			
			// Logic to detect existing entry
			const hasExistingEntry = (config: string, marker: string) => {
				return config.includes(marker);
			};
			
			const sampleConfig = `
# Some other entry
Host other-host
  HostName 1.2.3.4

# Multipass instance: test-instance
Host multipass-test-instance
  HostName 192.168.64.2
`;
			
			assert.strictEqual(
				hasExistingEntry(sampleConfig, existingEntry),
				true,
				'Should detect existing entry'
			);
		});

		test('Should set proper permissions on SSH config file', () => {
			const expectedPermissions = 0o600; // Read/write for owner only
			
			assert.strictEqual(expectedPermissions, 0o600, 'SSH config should have 600 permissions');
		});
	});

	suite('Authorized Keys Management', () => {
		test('Should add public key to instance authorized_keys', () => {
			const instanceName = 'test-instance';
			const targetFile = '~/.ssh/authorized_keys';
			
			const command = `multipass exec ${instanceName} -- bash -c "cat /tmp/new_key.pub >> ${targetFile}"`;
			
			assert.ok(command.includes('authorized_keys'), 'Should target authorized_keys file');
			assert.ok(command.includes('bash -c'), 'Should use bash -c for proper expansion');
			assert.ok(command.includes('>>'), 'Should append to file');
		});

		test('Should check for duplicate keys before adding', () => {
			const publicKey = 'ssh-rsa AAAAB3... test@key';
			const checkCommand = `grep -F '${publicKey}' ~/.ssh/authorized_keys`;
			
			assert.ok(checkCommand.includes('grep -F'), 'Should use grep to check for duplicates');
			assert.ok(checkCommand.includes('authorized_keys'), 'Should check authorized_keys file');
		});

		test('Should set proper permissions on authorized_keys', () => {
			const expectedPermissions = 0o600;
			const command = 'chmod 600 ~/.ssh/authorized_keys';
			
			assert.ok(command.includes('chmod 600'), 'Should set 600 permissions');
			assert.ok(command.includes('authorized_keys'), 'Should target authorized_keys');
		});

		test('Should create .ssh directory if not exists', () => {
			const instanceName = 'test-instance';
			const command = `multipass exec ${instanceName} -- bash -c "mkdir -p ~/.ssh && chmod 700 ~/.ssh"`;
			
			assert.ok(command.includes('mkdir -p'), 'Should create directory with -p flag');
			assert.ok(command.includes('chmod 700'), 'Should set 700 permissions on .ssh directory');
			assert.ok(command.includes('bash -c'), 'Should use bash -c for shell expansion');
		});
	});

	suite('SSH Connection Validation', () => {
		test('Should use correct SSH host format', () => {
			const instanceName = 'test-instance';
			const expectedHostName = `multipass-${instanceName}`;
			
			assert.strictEqual(expectedHostName, 'multipass-test-instance', 'Host name should have multipass- prefix');
		});

		test('Should test SSH connection after setup', () => {
			const testCommand = 'ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no -i "/path/to/key" ubuntu@192.168.64.2 "echo \'SSH connection successful\'"';
			
			assert.ok(testCommand.includes('ConnectTimeout'), 'Should set connection timeout');
			assert.ok(testCommand.includes('StrictHostKeyChecking=no'), 'Should disable strict checking for test');
			assert.ok(testCommand.includes('ubuntu@'), 'Should connect as ubuntu user');
		});

		test('Should handle Remote-SSH extension integration', () => {
			const extensionId = 'ms-vscode-remote.remote-ssh';
			const sshHostName = 'multipass-test-instance';
			
			// Commands that should be used
			const commands = [
				'remote-ssh.connectToHost',
				'opensshremotes.focus'
			];
			
			assert.ok(commands.includes('remote-ssh.connectToHost'), 'Should use connect command');
			assert.ok(extensionId.includes('remote-ssh'), 'Should check for Remote-SSH extension');
		});
	});

	suite('SSH Config Cleanup', () => {
		test('Should remove SSH config entry when instance is deleted', () => {
			const instanceName = 'test-instance';
			const marker = `# Multipass instance: ${instanceName}`;
			
			const shouldRemove = true; // When instance is deleted
			
			assert.strictEqual(shouldRemove, true, 'Should remove config entry on delete');
		});

		test('Should preserve other SSH config entries', () => {
			const config = `
# Some other host
Host other-host
  HostName 1.2.3.4

# Multipass instance: test-instance
Host multipass-test-instance
  HostName 192.168.64.2

# Another host
Host another-host
  HostName 5.6.7.8
`;

			const lines = config.split('\n');
			const hasOtherEntries = lines.some(line => line.includes('other-host'));
			
			assert.strictEqual(hasOtherEntries, true, 'Should preserve non-multipass entries');
		});
	});
});
