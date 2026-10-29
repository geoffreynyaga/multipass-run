import { ZONE_QUERY_TIMEOUT_MS } from '../config/timings';
import { type MultipassActionResult, multipassErrorMessage, runMultipassAction, runMultipassCommand } from '../utils/multipassExecutable';

export interface MultipassZone {
	name: string;
	available: boolean;
	subnet: string;
}

export interface ZonesResult {
	zones: MultipassZone[];
	error?: string;
}

/** v1.17 JSON is keyed directly by zone name; there is no zones wrapper. */
export function parseZones(stdout: string): MultipassZone[] {
	const data: unknown = JSON.parse(stdout);
	if (!data || typeof data !== 'object' || Array.isArray(data)) {
		throw new Error('Expected a zone object');
	}
	return Object.entries(data).map(([name, value]) => {
		if (!name || name.startsWith('-') || !value || typeof value !== 'object' ||
			!('available' in value) || typeof value.available !== 'boolean' ||
			!('subnet' in value) || typeof value.subnet !== 'string') {
			throw new Error(`Invalid zone data for ${name}`);
		}
		return { name, available: value.available, subnet: value.subnet };
	}).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
}

export async function getZones(): Promise<ZonesResult> {
	try {
		const { stdout } = await runMultipassCommand(['zones', '--format', 'json'], { timeout: ZONE_QUERY_TIMEOUT_MS });
		return { zones: parseZones(stdout) };
	} catch (error) {
		return { zones: [], error: multipassErrorMessage(error, 'Unable to load availability zones.') };
	}
}

/** The webview handler owns informed confirmation before passing --force. */
export async function setZoneAvailability(name: string, available: boolean): Promise<MultipassActionResult> {
	if (!name || name.startsWith('-')) {
		return { success: false, error: 'Invalid zone name.' };
	}
	return runMultipassAction(
		available ? ['enable-zones', name] : ['disable-zones', '--force', name],
		`Failed to ${available ? 'enable' : 'disable'} zone ${name}`
	);
}
