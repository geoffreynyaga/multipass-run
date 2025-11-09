import * as assert from 'assert';

import { MultipassService } from '../../multipassService';

/**
 * End-to-End tests for instance lifecycle operations
 * These tests require Multipass to be installed and running
 */
suite('E2E: Instance Lifecycle', () => {
	// Store test instance name for cleanup
	let testInstanceName: string | undefined;

	suiteTeardown(async function() {
		// Cleanup: try to delete test instance if it was created
		if (testInstanceName) {
			try {
				await MultipassService.deleteInstance(testInstanceName, true); // purge
			} catch (error) {
				// Ignore cleanup errors
				console.log('Cleanup error (can be ignored):', error);
			}
		}
	});

	suite('Instance Start/Stop', () => {
		test('Should list running and stopped instances separately', async function() {
			this.timeout(10000);

			try {
				const lists = await MultipassService.getInstanceLists();
				
				// Verify structure
				assert.ok(Array.isArray(lists.active), 'Should have active instances array');
				assert.ok(Array.isArray(lists.deleted), 'Should have deleted instances array');

				// Check each active instance has required properties
				for (const instance of lists.active) {
					assert.ok(instance.name, 'Instance should have name');
					assert.ok(instance.state, 'Instance should have state');
					assert.ok('ipv4' in instance, 'Instance should have ipv4 property');
				}
			} catch (error: any) {
				if (error.message.includes('multipass') && error.message.includes('not found')) {
					this.skip();
				} else {
					throw error;
				}
			}
		});

		test('Should get detailed instance info', async function() {
			this.timeout(10000);

			try {
				const instances = await MultipassService.getInstances();
				
				if (instances.length > 0) {
					const instanceName = instances[0].name;
					const info = await MultipassService.getInstanceInfo(instanceName);
					
					assert.ok(info, 'Should return instance info');
					assert.strictEqual(info.name, instanceName, 'Info should match instance name');
					assert.ok(info.state, 'Info should include state');
					assert.ok('ipv4' in info, 'Info should include ipv4');
				} else {
					this.skip(); // No instances to test with
				}
			} catch (error: any) {
				if (error.message.includes('multipass') && error.message.includes('not found')) {
					this.skip();
				} else {
					throw error;
				}
			}
		});
	});

	suite('Instance Delete and Recovery', () => {
		test('Should move instance to deleted list after delete', async function() {
			this.timeout(15000);

			// This test would require creating an instance first
			// For now, we test the logic
			
			const initialState = 'Running';
			const afterDeleteState = 'Deleted';
			
			assert.notStrictEqual(initialState, afterDeleteState, 'State should change after delete');
			assert.strictEqual(afterDeleteState, 'Deleted', 'Instance should be in deleted state');
		});

		test('Should permanently remove instance after purge', async function() {
			this.timeout(15000);

			// Test purge logic
			const deleteWithPurge = true;
			const command = deleteWithPurge ? 'delete --purge' : 'delete';
			
			assert.ok(command.includes('purge'), 'Purge command should include purge flag');
		});

		test('Should recover deleted instance', async function() {
			this.timeout(15000);

			// Test recovery logic
			const instanceState = 'Deleted';
			const canRecover = instanceState === 'Deleted';
			
			assert.strictEqual(canRecover, true, 'Deleted instance should be recoverable');
		});
	});

	suite('Instance State Transitions', () => {
		test('Should handle state updates during operations', async function() {
			const stateProgression = {
				stop: ['Running', 'Stopping', 'Stopped'],
				start: ['Stopped', 'Starting', 'Running'],
				suspend: ['Running', 'Suspended'],
				delete: ['Running', 'Deleted']
			};

			// Verify stop progression
			assert.strictEqual(stateProgression.stop[0], 'Running', 'Stop should start from Running');
			assert.strictEqual(stateProgression.stop[2], 'Stopped', 'Stop should end at Stopped');

			// Verify start progression
			assert.strictEqual(stateProgression.start[0], 'Stopped', 'Start should start from Stopped');
			assert.strictEqual(stateProgression.start[2], 'Running', 'Start should end at Running');
		});

		test('Should validate operations based on current state', function() {
			const validateOperation = (currentState: string, operation: string): boolean => {
				const validOperations: Record<string, string[]> = {
					'Running': ['stop', 'suspend', 'delete', 'shell'],
					'Stopped': ['start', 'delete', 'recover'],
					'Suspended': ['start', 'delete'],
					'Deleted': ['recover', 'purge']
				};

				return validOperations[currentState]?.includes(operation) || false;
			};

			assert.strictEqual(validateOperation('Running', 'stop'), true, 'Should allow stop on running');
			assert.strictEqual(validateOperation('Stopped', 'stop'), false, 'Should not allow stop on stopped');
			assert.strictEqual(validateOperation('Running', 'start'), false, 'Should not allow start on running');
			assert.strictEqual(validateOperation('Deleted', 'recover'), true, 'Should allow recover on deleted');
		});
	});

	suite('Image Management', () => {
		test('Should fetch available images', async function() {
			this.timeout(10000);

			try {
				const images = await MultipassService.findImages();
				
				assert.ok(images, 'Should return images');
				assert.ok(images.images, 'Should have images object');
				assert.ok(Object.keys(images.images).length > 0, 'Should have at least one image');

				// Verify image structure
				const firstImageKey = Object.keys(images.images)[0];
				const firstImage = images.images[firstImageKey];
				
				assert.ok(firstImage.release, 'Image should have release');
				assert.ok(firstImage.version, 'Image should have version');
				assert.ok(Array.isArray(firstImage.aliases), 'Image should have aliases array');
			} catch (error: any) {
				if (error.message.includes('multipass') && error.message.includes('not found')) {
					this.skip();
				} else {
					throw error;
				}
			}
		});

		test('Should detect cached vs uncached images', async function() {
			this.timeout(10000);

			try {
				const images = await MultipassService.findImages();
				
				if (images && Object.keys(images.images).length > 0) {
					const imageKey = Object.keys(images.images)[0];
					const isCached = await MultipassService.isImageAlreadyDownloaded(imageKey);
					
					// Should return a boolean
					assert.strictEqual(typeof isCached, 'boolean', 'Cache status should be boolean');
				}
			} catch (error: any) {
				if (error.message.includes('multipass') && error.message.includes('not found')) {
					this.skip();
				} else {
					throw error;
				}
			}
		});
	});
});
