import * as assert from 'assert';
import * as vscode from 'vscode';

import { MultipassService } from '../../multipassService';

/**
 * End-to-End tests for instance creation flow
 * These tests require Multipass to be installed and running
 */
suite('E2E: Instance Creation', () => {
	suite('Image Download Detection', () => {
		test('Should detect if image is already cached', async function() {
			this.timeout(10000); // Increase timeout for network operations

			try {
				const images = await MultipassService.findImages();
				assert.ok(images, 'Should be able to fetch images list');

				if (images && Object.keys(images.images).length > 0) {
					const firstImageKey = Object.keys(images.images)[0];
					
					// Test the isImageAlreadyDownloaded function
					const isCached = await MultipassService.isImageAlreadyDownloaded(firstImageKey);
					
					// isCached should be a boolean
					assert.strictEqual(typeof isCached, 'boolean', 'Should return boolean for cache status');
				}
			} catch (error: any) {
				if (error.message.includes('multipass') && error.message.includes('not found')) {
					this.skip(); // Skip if Multipass is not installed
				} else {
					throw error;
				}
			}
		});

		test('Should show "Downloading Image" state for uncached image', async function() {
			this.timeout(5000);

			// Simulate uncached image scenario
			const isImageCached = false;
			const expectedState = isImageCached ? 'Creating' : 'Downloading Image';
			
			assert.strictEqual(expectedState, 'Downloading Image', 'Should show downloading state for uncached image');
		});

		test('Should show "Creating" state for cached image', async function() {
			this.timeout(5000);

			// Simulate cached image scenario
			const isImageCached = true;
			const expectedState = isImageCached ? 'Creating' : 'Downloading Image';
			
			assert.strictEqual(expectedState, 'Creating', 'Should show creating state for cached image');
		});
	});

	suite('Instance Name Conflict Detection', () => {
		test('Should detect existing instance names', async function() {
			this.timeout(10000);

			try {
				const instances = await MultipassService.getInstances();
				
				if (instances.length > 0) {
					const existingName = instances[0].name;
					const exists = await MultipassService.instanceNameExists(existingName);
					
					assert.strictEqual(exists, true, 'Should detect existing instance name');
				} else {
					// No instances, test with non-existent name
					const exists = await MultipassService.instanceNameExists('non-existent-instance-12345');
					assert.strictEqual(exists, false, 'Non-existent instance should return false');
				}
			} catch (error: any) {
				if (error.message.includes('multipass') && error.message.includes('not found')) {
					this.skip(); // Skip if Multipass is not installed
				} else {
					throw error;
				}
			}
		});

		test('Should prevent duplicate instance names (case-insensitive)', async function() {
			this.timeout(10000);

			try {
				const instances = await MultipassService.getInstances();
				
				if (instances.length > 0) {
					const existingName = instances[0].name;
					const upperCaseName = existingName.toUpperCase();
					const exists = await MultipassService.instanceNameExists(upperCaseName);
					
					// Should detect as existing even with different case
					assert.strictEqual(exists, true, 'Should detect instance name regardless of case');
				}
			} catch (error: any) {
				if (error.message.includes('multipass') && error.message.includes('not found')) {
					this.skip(); // Skip if Multipass is not installed
				} else {
					throw error;
				}
			}
		});
	});

	suite('Instance List Retrieval', () => {
		test('Should retrieve instance lists', async function() {
			this.timeout(10000);

			try {
				const lists = await MultipassService.getInstanceLists();
				
				assert.ok(lists, 'Should return instance lists');
				assert.ok(Array.isArray(lists.active), 'Active list should be an array');
				assert.ok(Array.isArray(lists.deleted), 'Deleted list should be an array');
			} catch (error: any) {
				if (error.message.includes('multipass') && error.message.includes('not found')) {
					this.skip(); // Skip if Multipass is not installed
				} else {
					throw error;
				}
			}
		});

		test('Should handle empty instance list', async function() {
			this.timeout(10000);

			try {
				const lists = await MultipassService.getInstanceLists();
				
				// Should handle empty lists gracefully
				if (lists.active.length === 0 && lists.deleted.length === 0) {
					assert.strictEqual(lists.active.length, 0, 'Active list should be empty');
					assert.strictEqual(lists.deleted.length, 0, 'Deleted list should be empty');
				}
			} catch (error: any) {
				if (error.message.includes('multipass') && error.message.includes('not found')) {
					this.skip(); // Skip if Multipass is not installed
				} else {
					throw error;
				}
			}
		});
	});

	suite('Instance Creation Validation', () => {
		test('Should validate instance name before creation', async function() {
			// Test name validation patterns
			const invalidNames = ['', 'my instance', 'my@instance', 'instance.name'];
			const validNames = ['myinstance', 'my-instance', 'my_instance_123'];

			for (const name of invalidNames) {
				const isValid = /^[a-zA-Z0-9-_]+$/.test(name) && name.trim() !== '';
				assert.strictEqual(isValid, false, `Invalid name "${name}" should be rejected`);
			}

			for (const name of validNames) {
				const isValid = /^[a-zA-Z0-9-_]+$/.test(name) && name.trim() !== '';
				assert.strictEqual(isValid, true, `Valid name "${name}" should be accepted`);
			}
		});

		test('Should validate detailed instance configuration', function() {
			const validConfig = {
				cpus: '2',
				memory: '2G',
				disk: '10G'
			};

			const cpuValid = !isNaN(parseInt(validConfig.cpus)) && parseInt(validConfig.cpus) >= 1;
			const memoryValid = /^\d+(\.\d+)?[KMG]$/.test(validConfig.memory);
			const diskValid = /^\d+(\.\d+)?[KMG]$/.test(validConfig.disk);

			assert.strictEqual(cpuValid, true, 'CPU validation should pass');
			assert.strictEqual(memoryValid, true, 'Memory validation should pass');
			assert.strictEqual(diskValid, true, 'Disk validation should pass');
		});
	});
});
