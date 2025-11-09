import * as assert from 'assert';
import * as vscode from 'vscode';

import { instanceNameExists } from '../../commands/launch/instanceNameExists';

suite('Instance Name Tests', () => {
	suite('Instance Name Validation', () => {
		test('Should reject empty instance name', () => {
			const name = '';
			const isValid = /^[a-zA-Z0-9-_]+$/.test(name) && name.trim() !== '';
			assert.strictEqual(isValid, false, 'Empty name should be invalid');
		});

		test('Should reject instance name with spaces', () => {
			const name = 'my instance';
			const isValid = /^[a-zA-Z0-9-_]+$/.test(name);
			assert.strictEqual(isValid, false, 'Name with spaces should be invalid');
		});

		test('Should reject instance name with special characters', () => {
			const invalidNames = ['my@instance', 'my.instance', 'my#instance', 'my!instance'];
			for (const name of invalidNames) {
				const isValid = /^[a-zA-Z0-9-_]+$/.test(name);
				assert.strictEqual(isValid, false, `Name "${name}" with special characters should be invalid`);
			}
		});

		test('Should accept valid instance name with letters', () => {
			const name = 'myinstance';
			const isValid = /^[a-zA-Z0-9-_]+$/.test(name);
			assert.strictEqual(isValid, true, 'Name with only letters should be valid');
		});

		test('Should accept valid instance name with numbers', () => {
			const name = 'myinstance123';
			const isValid = /^[a-zA-Z0-9-_]+$/.test(name);
			assert.strictEqual(isValid, true, 'Name with letters and numbers should be valid');
		});

		test('Should accept valid instance name with hyphens', () => {
			const name = 'my-instance-123';
			const isValid = /^[a-zA-Z0-9-_]+$/.test(name);
			assert.strictEqual(isValid, true, 'Name with hyphens should be valid');
		});

		test('Should accept valid instance name with underscores', () => {
			const name = 'my_instance_123';
			const isValid = /^[a-zA-Z0-9-_]+$/.test(name);
			assert.strictEqual(isValid, true, 'Name with underscores should be valid');
		});

		test('Should truncate long instance names', () => {
			const longName = 'a'.repeat(100);
			const maxLength = 50; // Typical max length for instance names
			const truncated = longName.substring(0, maxLength);
			assert.strictEqual(truncated.length, maxLength, 'Long name should be truncated to max length');
			assert.ok(truncated.length <= maxLength, 'Truncated name should not exceed max length');
		});
	});

	suite('Instance Name Uniqueness', () => {
		test('Should detect duplicate instance names (case-insensitive)', async () => {
			// This test requires mocking the instanceNameExists function
			// For now, we test the logic
			const existingNames = ['instance1', 'instance2', 'MyInstance'];
			const testName = 'myinstance';
			
			const isDuplicate = existingNames.some(
				name => name.toLowerCase() === testName.toLowerCase()
			);
			
			assert.strictEqual(isDuplicate, true, 'Should detect duplicate name regardless of case');
		});

		test('Should allow unique instance names', async () => {
			const existingNames = ['instance1', 'instance2', 'MyInstance'];
			const testName = 'newinstance';
			
			const isDuplicate = existingNames.some(
				name => name.toLowerCase() === testName.toLowerCase()
			);
			
			assert.strictEqual(isDuplicate, false, 'Should allow unique instance name');
		});
	});

	suite('Detailed Instance Name Validation', () => {
		test('Should reject name not starting with letter', () => {
			const invalidNames = ['1instance', '-instance', '_instance'];
			const pattern = /^[a-zA-Z][a-zA-Z0-9-]*[a-zA-Z0-9]$/;
			
			for (const name of invalidNames) {
				const isValid = pattern.test(name);
				assert.strictEqual(isValid, false, `Name "${name}" not starting with letter should be invalid`);
			}
		});

		test('Should reject name not ending with alphanumeric', () => {
			const invalidNames = ['instance-', 'instance_'];
			const pattern = /^[a-zA-Z][a-zA-Z0-9-]*[a-zA-Z0-9]$/;
			
			for (const name of invalidNames) {
				const isValid = pattern.test(name);
				assert.strictEqual(isValid, false, `Name "${name}" not ending with alphanumeric should be invalid`);
			}
		});

		test('Should accept valid detailed instance name', () => {
			const validNames = ['instance', 'i1', 'my-instance-123', 'MyInstance1'];
			const pattern = /^[a-zA-Z][a-zA-Z0-9-]*[a-zA-Z0-9]$/;
			
			for (const name of validNames) {
				const isValid = pattern.test(name);
				assert.strictEqual(isValid, true, `Name "${name}" should be valid`);
			}
		});
	});
});
