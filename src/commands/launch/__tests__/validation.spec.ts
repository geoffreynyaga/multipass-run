import { validateCpus, validateDisk, validateInstanceName, validateMemory } from '../validation';

describe('validateInstanceName', () => {
	it.each(['a', 'web', 'my-vm', 'vm1', 'Dev-Box-2'])('accepts %s', (name) => {
		expect(validateInstanceName(name)).toBeUndefined();
	});

	it.each(['', '   '])('rejects empty name %j', (name) => {
		expect(validateInstanceName(name)).toBe('Instance name cannot be empty');
	});

	it.each(['my_vm', '1vm', '-vm', 'vm-', 'my vm', 'vm.local'])('rejects %s', (name) => {
		expect(validateInstanceName(name)).toMatch(/must start with a letter/);
	});
});

describe('validateCpus', () => {
	it.each(['1', '2', '16'])('accepts %s', (value) => {
		expect(validateCpus(value)).toBeUndefined();
	});

	it.each(['', '0', '-1', '1.5', 'two', '2x'])('rejects %j', (value) => {
		expect(validateCpus(value)).toBeDefined();
	});
});

describe('validateMemory', () => {
	it.each(['128M', '512M', '1G', '1.5G', '2G'])('accepts %s', (value) => {
		expect(validateMemory(value)).toBeUndefined();
	});

	it.each(['', '2', '2GB', 'G', '2T'])('rejects bad format %j', (value) => {
		expect(validateMemory(value)).toMatch(/Format/);
	});

	it('rejects less than 128M', () => {
		expect(validateMemory('127M')).toBe('Minimum memory: 128M');
	});
});

describe('validateDisk', () => {
	it.each(['512M', '5G', '10G'])('accepts %s', (value) => {
		expect(validateDisk(value)).toBeUndefined();
	});

	it.each(['', '10', '10GB'])('rejects bad format %j', (value) => {
		expect(validateDisk(value)).toMatch(/Format/);
	});

	it('rejects less than 512M', () => {
		expect(validateDisk('511M')).toBe('Minimum disk: 512M');
	});
});
