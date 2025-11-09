import * as assert from 'assert';

suite('Resource Validation Tests', () => {
	suite('CPU Validation', () => {
		test('Should reject non-numeric CPU values', () => {
			const invalidValues = ['abc', '1.5', 'two', ''];

			for (const value of invalidValues) {
				const num = parseInt(value);
				// Must be integer (no decimals) and valid number
				const isValid = !isNaN(num) && num >= 1 && !value.includes('.');
				assert.strictEqual(isValid, false, `CPU value "${value}" should be invalid`);
			}
		});

		test('Should reject zero or negative CPUs', () => {
			const invalidValues = ['0', '-1', '-5'];

			for (const value of invalidValues) {
				const num = parseInt(value);
				const isValid = !isNaN(num) && num >= 1;
				assert.strictEqual(isValid, false, `CPU value "${value}" should be invalid`);
			}
		});

		test('Should accept valid positive CPU values', () => {
			const validValues = ['1', '2', '4', '8', '16'];

			for (const value of validValues) {
				const num = parseInt(value);
				const isValid = !isNaN(num) && num >= 1;
				assert.strictEqual(isValid, true, `CPU value "${value}" should be valid`);
			}
		});
	});

	suite('Memory Validation', () => {
		test('Should reject invalid memory format', () => {
			const invalidValues = ['abc', '123', '1.5GB', '1 G', 'M', 'G'];
			const pattern = /^\d+(\.\d+)?[KMG]$/;

			for (const value of invalidValues) {
				const isValid = pattern.test(value);
				assert.strictEqual(isValid, false, `Memory value "${value}" should be invalid`);
			}
		});

		test('Should accept valid memory format', () => {
			const validValues = ['512M', '1G', '2048M', '4G', '1.5G', '256K'];
			const pattern = /^\d+(\.\d+)?[KMG]$/;

			for (const value of validValues) {
				const isValid = pattern.test(value);
				assert.strictEqual(isValid, true, `Memory value "${value}" should be valid`);
			}
		});

		test('Should enforce minimum memory of 128M', () => {
			const testMemoryMin = (value: string) => {
				const match = value.match(/^(\d+(?:\.\d+)?)([KMG])$/);
				if (!match) {
					return false;
				}

				const amount = parseFloat(match[1]);
				const unit = match[2];
				const bytes = unit === 'G' ? amount * 1024 * 1024 * 1024 :
				             unit === 'M' ? amount * 1024 * 1024 :
				             amount * 1024;
				return bytes >= 128 * 1024 * 1024;
			};

			assert.strictEqual(testMemoryMin('64M'), false, '64M should be below minimum');
			assert.strictEqual(testMemoryMin('100M'), false, '100M should be below minimum');
			assert.strictEqual(testMemoryMin('128M'), true, '128M should be valid');
			assert.strictEqual(testMemoryMin('256M'), true, '256M should be valid');
			assert.strictEqual(testMemoryMin('1G'), true, '1G should be valid');
		});
	});

	suite('Disk Validation', () => {
		test('Should reject invalid disk format', () => {
			const invalidValues = ['abc', '123', '5.5GB', '10 G', 'G', 'M'];
			const pattern = /^\d+(\.\d+)?[KMG]$/;

			for (const value of invalidValues) {
				const isValid = pattern.test(value);
				assert.strictEqual(isValid, false, `Disk value "${value}" should be invalid`);
			}
		});

		test('Should accept valid disk format', () => {
			const validValues = ['512M', '1G', '5G', '10G', '2048M', '1.5G'];
			const pattern = /^\d+(\.\d+)?[KMG]$/;

			for (const value of validValues) {
				const isValid = pattern.test(value);
				assert.strictEqual(isValid, true, `Disk value "${value}" should be valid`);
			}
		});

		test('Should enforce minimum disk of 512M', () => {
			const testDiskMin = (value: string) => {
				const match = value.match(/^(\d+(?:\.\d+)?)([KMG])$/);
				if (!match) {
					return false;
				}

				const amount = parseFloat(match[1]);
				const unit = match[2];
				const bytes = unit === 'G' ? amount * 1024 * 1024 * 1024 :
				             unit === 'M' ? amount * 1024 * 1024 :
				             amount * 1024;
				return bytes >= 512 * 1024 * 1024;
			};

			assert.strictEqual(testDiskMin('256M'), false, '256M should be below minimum');
			assert.strictEqual(testDiskMin('400M'), false, '400M should be below minimum');
			assert.strictEqual(testDiskMin('512M'), true, '512M should be valid');
			assert.strictEqual(testDiskMin('1G'), true, '1G should be valid');
			assert.strictEqual(testDiskMin('5G'), true, '5G should be valid');
		});
	});

	suite('Resource Combination Validation', () => {
		test('Should validate complete resource configuration', () => {
			interface ResourceConfig {
				cpus: string;
				memory: string;
				disk: string;
			}

			const validateConfig = (config: ResourceConfig): { valid: boolean; error?: string } => {
				// Validate CPUs
				const cpuNum = parseInt(config.cpus);
				if (isNaN(cpuNum) || cpuNum < 1) {
					return { valid: false, error: 'Invalid CPU count' };
				}

				// Validate memory format
				if (!/^\d+(\.\d+)?[KMG]$/.test(config.memory)) {
					return { valid: false, error: 'Invalid memory format' };
				}

				// Validate disk format
				if (!/^\d+(\.\d+)?[KMG]$/.test(config.disk)) {
					return { valid: false, error: 'Invalid disk format' };
				}

				return { valid: true };
			};

			const validConfig: ResourceConfig = { cpus: '2', memory: '2G', disk: '10G' };
			const result1 = validateConfig(validConfig);
			assert.strictEqual(result1.valid, true, 'Valid config should pass');

			const invalidCpuConfig: ResourceConfig = { cpus: '0', memory: '2G', disk: '10G' };
			const result2 = validateConfig(invalidCpuConfig);
			assert.strictEqual(result2.valid, false, 'Invalid CPU config should fail');

			const invalidMemoryConfig: ResourceConfig = { cpus: '2', memory: '2GB', disk: '10G' };
			const result3 = validateConfig(invalidMemoryConfig);
			assert.strictEqual(result3.valid, false, 'Invalid memory config should fail');
		});
	});
});
