import { MULTIPASS_ENVIRONMENT_TIMEOUT_MS } from '../config/timings';
import { multipassErrorMessage, runMultipassCommand } from './multipassExecutable';
import type { MultipassEnvironment } from './multipassVersion';

function versionString(value: unknown): string | null {
	return typeof value === 'string' && value.trim() ? value.trim() : null;
}

// The tagged 1.17 formatter emits named string fields, with multipassd absent
// when no daemon reply is available. Update metadata is unrelated to detection.
function parseVersions(stdout: string): Pick<MultipassEnvironment, 'clientVersion' | 'daemonVersion'> {
	const data: unknown = JSON.parse(stdout);
	if (!data || typeof data !== 'object' || Array.isArray(data)) {
		throw new Error('Expected a version object');
	}
	return {
		clientVersion: versionString('multipass' in data ? data.multipass : undefined),
		daemonVersion: versionString('multipassd' in data ? data.multipassd : undefined),
	};
}

/** Inspect the real CLI/daemon instead of inferring a backend from the host OS. */
export async function detectMultipassEnvironment(): Promise<MultipassEnvironment> {
	const environment: MultipassEnvironment = { clientVersion: null, daemonVersion: null, driver: null, errors: [] };
	const [version, driver] = await Promise.allSettled([
		runMultipassCommand(['version', '--format', 'json'], { timeout: MULTIPASS_ENVIRONMENT_TIMEOUT_MS }),
		runMultipassCommand(['get', 'local.driver'], { timeout: MULTIPASS_ENVIRONMENT_TIMEOUT_MS }),
	]);

	// A failed version query may still report the client version on stdout when
	// the daemon is unreachable. Preserve that evidence without inventing a daemon version.
	let versionOutput = '';
	if (version.status === 'fulfilled') {
		versionOutput = version.value.stdout;
	} else {
		const failure: unknown = version.reason;
		if (failure && typeof failure === 'object' && 'stdout' in failure && typeof failure.stdout === 'string') {
			versionOutput = failure.stdout;
		}
		environment.errors.push(`Version query: ${multipassErrorMessage(failure, 'Unable to inspect Multipass versions.')}`);
	}
	if (versionOutput) {
		try {
			Object.assign(environment, parseVersions(versionOutput));
		} catch {
			environment.errors.push('Version query returned invalid JSON.');
		}
	}
	if (!environment.clientVersion) {
		environment.errors.push('Client version was not reported.');
	}
	if (!environment.daemonVersion) {
		environment.errors.push('Daemon version was not reported.');
	}

	if (driver.status === 'fulfilled') {
		const name = driver.value.stdout.trim().toLowerCase();
		if (/^[a-z][a-z0-9-]*$/.test(name)) {
			environment.driver = name;
		} else {
			environment.errors.push('Driver query returned an empty or invalid driver name.');
		}
	} else {
		environment.errors.push(`Driver query: ${multipassErrorMessage(driver.reason, 'Unable to inspect local.driver.')}`);
	}
	return environment;
}
