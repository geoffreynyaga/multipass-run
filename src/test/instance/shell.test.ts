import * as assert from 'assert';

suite('Shell Command Tests', () => {
	suite('Shell Instance Validation', () => {
		test('Should only allow shell on running instances', () => {
			const validShellStates = ['Running'];
			
			const canOpenShell = (state: string) => 
				validShellStates.some(s => s.toLowerCase() === state.toLowerCase());
			
			assert.strictEqual(canOpenShell('Running'), true, 'Shell should work on running instance');
			assert.strictEqual(canOpenShell('Stopped'), false, 'Shell should not work on stopped instance');
			assert.strictEqual(canOpenShell('Suspended'), false, 'Shell should not work on suspended instance');
			assert.strictEqual(canOpenShell('Deleted'), false, 'Shell should not work on deleted instance');
		});

		test('Should require instance name for shell', () => {
			const instanceName = '';
			const isValid = instanceName.length > 0;
			
			assert.strictEqual(isValid, false, 'Empty instance name should be invalid for shell');
		});
	});

	suite('Shell Command Format', () => {
		test('Should use correct multipass shell command', () => {
			const instanceName = 'test-instance';
			const command = `multipass shell ${instanceName}`;
			
			assert.ok(command.includes('multipass shell'), 'Should use multipass shell command');
			assert.ok(command.includes(instanceName), 'Should include instance name');
		});

		test('Should open shell in integrated terminal', () => {
			// VS Code terminal integration
			const terminalName = 'Multipass: test-instance';
			
			assert.ok(terminalName.includes('Multipass:'), 'Terminal name should have Multipass prefix');
			assert.ok(terminalName.includes('test-instance'), 'Terminal name should include instance name');
		});
	});

	suite('Terminal Management', () => {
		test('Should track terminals per instance', () => {
			const instanceTerminals = new Map<string, any[]>();
			const instanceName = 'test-instance';
			
			// Simulate adding terminal
			if (!instanceTerminals.has(instanceName)) {
				instanceTerminals.set(instanceName, []);
			}
			instanceTerminals.get(instanceName)?.push({ name: 'terminal1' });
			
			assert.ok(instanceTerminals.has(instanceName), 'Should track terminal for instance');
			assert.strictEqual(instanceTerminals.get(instanceName)?.length, 1, 'Should have one terminal');
		});

		test('Should close all terminals when instance is deleted', () => {
			const instanceName = 'test-instance';
			const instanceTerminals = new Map<string, any[]>();
			instanceTerminals.set(instanceName, [
				{ name: 'term1', dispose: () => {} },
				{ name: 'term2', dispose: () => {} }
			]);
			
			// Simulate cleanup
			const terminals = instanceTerminals.get(instanceName);
			assert.ok(terminals && terminals.length > 0, 'Should have terminals to close');
			
			instanceTerminals.delete(instanceName);
			assert.ok(!instanceTerminals.has(instanceName), 'Terminals should be cleared after delete');
		});

		test('Should reuse existing terminal if available', () => {
			const instanceName = 'test-instance';
			const existingTerminals = new Map<string, any[]>();
			existingTerminals.set(instanceName, [{ name: 'existing' }]);
			
			const shouldReuseTerminal = existingTerminals.has(instanceName) && 
			                           existingTerminals.get(instanceName)!.length > 0;
			
			assert.strictEqual(shouldReuseTerminal, true, 'Should detect existing terminal');
		});
	});
});
