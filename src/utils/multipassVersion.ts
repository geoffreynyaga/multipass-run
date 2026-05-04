import { execFile } from 'child_process';
import { findMultipassExecutable } from './multipassExecutable';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export interface MultipassCapabilities {
	version?: string;
	supportsAlternativeDistros: boolean;
}

function parseVersion(output: string): string | undefined {
	const match = output.match(/\b(\d+)\.(\d+)\.(\d+)(?:[+\-\w.]*)?\b/);
	return match?.[1] && match?.[2] && match?.[3]
		? `${match[1]}.${match[2]}.${match[3]}`
		: undefined;
}

function isAtLeast(version: string, minimum: string): boolean {
	const current = version.split('.').map((part) => parseInt(part, 10));
	const target = minimum.split('.').map((part) => parseInt(part, 10));
	for (let i = 0; i < target.length; i++) {
		const lhs = current[i] ?? 0;
		const rhs = target[i] ?? 0;
		if (lhs > rhs) {
			return true;
		}
		if (lhs < rhs) {
			return false;
		}
	}
	return true;
}

export async function getMultipassCapabilities(): Promise<MultipassCapabilities> {
	try {
		const multipassPath = await findMultipassExecutable();
		const { stdout, stderr } = await execFileAsync(multipassPath, ['version']);
		const version = parseVersion(`${stdout}\n${stderr}`);
		return {
			version,
			supportsAlternativeDistros: version ? isAtLeast(version, '1.17.0') : false,
		};
	} catch (error) {
		console.warn('Failed to detect Multipass capabilities:', error);
		return { supportsAlternativeDistros: false };
	}
}

