// Import all test suites
import './launch/instanceName.test';
import './launch/resourceValidation.test';
import './multipass/installation.test';
import './instance/state.test';
import './instance/delete.test';
import './instance/lifecycle.test';
import './instance/shell.test';
import './ssh/sshConfig.test';
import './e2e/instanceCreation.test';
import './e2e/instanceLifecycle.test';

import * as assert from 'assert';
import * as vscode from 'vscode';

/**
 * Main extension test suite
 * This file imports and runs all test suites
 */


suite('Multipass Extension Test Suite', () => {
	vscode.window.showInformationMessage('Running all Multipass extension tests...');

	test('Extension should be present', () => {
		const extension = vscode.extensions.getExtension('GeoffreyNyaga.multipass-run');
		assert.ok(extension !== undefined, 'Extension should be installed');
	});

	test('Extension should activate', async () => {
		const extension = vscode.extensions.getExtension('GeoffreyNyaga.multipass-run');
		if (extension) {
			await extension.activate();
			assert.ok(extension.isActive, 'Extension should be active');
		}
	});

	test('Extension should register commands', async () => {
		const commands = await vscode.commands.getCommands(true);
		
		const expectedCommands = [
			'multipass-run.refresh',
			'multipass-run.createInstanceMenu'
		];

		for (const cmd of expectedCommands) {
			assert.ok(
				commands.includes(cmd),
				`Command ${cmd} should be registered`
			);
		}
	});
});

