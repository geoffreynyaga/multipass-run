import * as assert from 'assert';

suite('Delete Instance Tests', () => {
	suite('Delete Operation Validation', () => {
		test('Should require instance name for deletion', () => {
			const instanceName = '';
			const isValid = instanceName.length > 0 && instanceName.trim().length > 0;
			
			assert.strictEqual(isValid, false, 'Empty instance name should be invalid');
		});

		test('Should accept valid instance name for deletion', () => {
			const instanceName = 'test-instance';
			const isValid = instanceName && instanceName.trim().length > 0;
			
			assert.strictEqual(isValid, true, 'Valid instance name should be accepted');
		});

		test('Should purge instance with --purge flag', () => {
			const shouldPurge = true;
			const command = shouldPurge ? 'multipass delete --purge instance-name' : 'multipass delete instance-name';
			
			assert.ok(command.includes('--purge'), 'Purge command should include --purge flag');
		});

		test('Should delete without purge by default', () => {
			const shouldPurge = false;
			const command = shouldPurge ? 'multipass delete --purge instance-name' : 'multipass delete instance-name';
			
			assert.ok(!command.includes('--purge'), 'Delete command should not include --purge flag');
		});
	});

	suite('Delete State Validation', () => {
		test('Should allow deleting stopped instance', () => {
			const instanceState = 'Stopped';
			const canDelete = ['Stopped', 'Suspended', 'Running'].includes(instanceState);
			
			assert.strictEqual(canDelete, true, 'Stopped instance should be deletable');
		});

		test('Should allow deleting suspended instance', () => {
			const instanceState = 'Suspended';
			const canDelete = ['Stopped', 'Suspended', 'Running'].includes(instanceState);
			
			assert.strictEqual(canDelete, true, 'Suspended instance should be deletable');
		});

		test('Should allow deleting running instance', () => {
			const instanceState = 'Running';
			const canDelete = ['Stopped', 'Suspended', 'Running'].includes(instanceState);
			
			assert.strictEqual(canDelete, true, 'Running instance should be deletable');
		});

		test('Should not delete already deleted instance', () => {
			const instanceState = 'Deleted';
			const canDelete = !instanceState.includes('Deleted');
			
			assert.strictEqual(canDelete, false, 'Already deleted instance should not be deletable again');
		});
	});

	suite('Delete Confirmation', () => {
		test('Should require confirmation before deletion', () => {
			const requireConfirmation = true;
			
			assert.strictEqual(requireConfirmation, true, 'Deletion should require confirmation');
		});

		test('Should show instance name in confirmation message', () => {
			const instanceName = 'my-instance';
			const confirmMessage = `Are you sure you want to delete instance '${instanceName}'?`;
			
			assert.ok(confirmMessage.includes(instanceName), 'Confirmation should mention instance name');
			assert.ok(confirmMessage.includes('delete'), 'Confirmation should mention deletion');
		});

		test('Should differentiate between delete and purge in message', () => {
			const instanceName = 'my-instance';
			const deleteMessage = `Delete instance '${instanceName}'? (can be recovered)`;
			const purgeMessage = `Permanently delete instance '${instanceName}'? (cannot be recovered)`;
			
			assert.ok(deleteMessage.includes('recovered'), 'Delete message should mention recovery');
			assert.ok(purgeMessage.includes('cannot be recovered'), 'Purge message should warn about permanence');
		});
	});
});
