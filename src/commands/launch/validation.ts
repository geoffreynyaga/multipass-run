// Launch input rules shared by every launch path. Each function returns an
// error message, or undefined when the value is valid.

// Same rule multipass applies to instance names.
const INSTANCE_NAME_PATTERN = /^[a-zA-Z]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/;
const SIZE_PATTERN = /^(\d+(?:\.\d+)?)([KMG])$/;
const MB = 1024 * 1024;
const UNIT_BYTES = { K: 1024, M: MB, G: 1024 * MB } as const;

export function validateInstanceName(name: string): string | undefined {
	if (name.trim() === '') {
		return 'Instance name cannot be empty';
	}
	if (!INSTANCE_NAME_PATTERN.test(name)) {
		return 'Name must start with a letter, use only letters, digits and hyphens, and end with a letter or digit';
	}
	return undefined;
}

export function validateCpus(value: string): string | undefined {
	if (!/^\d+$/.test(value) || parseInt(value, 10) < 1) {
		return 'Must be a positive integer (minimum: 1)';
	}
	return undefined;
}

export function validateMemory(value: string): string | undefined {
	return validateSize(value, 512, 'memory', '1G, 512M');
}

export function validateDisk(value: string): string | undefined {
	return validateSize(value, 1024, 'disk', '5G, 2048M');
}

function validateSize(value: string, minMb: number, label: string, example: string): string | undefined {
	const match = SIZE_PATTERN.exec(value);
	if (!match) {
		return `Format: number with K, M, or G suffix (e.g., ${example})`;
	}
	const bytes = parseFloat(match[1]) * UNIT_BYTES[match[2] as keyof typeof UNIT_BYTES];
	if (bytes < minMb * MB) {
		return `Minimum ${label}: ${minMb}M`;
	}
	return undefined;
}
