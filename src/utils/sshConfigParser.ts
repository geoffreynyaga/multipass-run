/**
 * Pure helpers for editing the multipass-run section of `~/.ssh/config`.
 *
 * Each managed entry is wrapped in explicit bracket markers so that the
 * remove operation is robust against manual edits inside the block:
 *
 *   # >>> multipass-run: my-vm
 *   Host multipass-my-vm
 *     HostName 10.0.0.5
 *     ...
 *   # <<< multipass-run: my-vm
 *
 * `migrateLegacyBlocks` rewrites the older `# Multipass instance: <name>`
 * format on first run so existing installs keep working.
 */

export const BLOCK_BEGIN_PREFIX = '# >>> multipass-run: ';
export const BLOCK_END_PREFIX = '# <<< multipass-run: ';
export const LEGACY_MARKER_PREFIX = '# Multipass instance: ';

export interface BlockRange {
	instanceName: string;
	start: number;
	end: number;
}

const BEGIN_RE = /^# >>> multipass-run:\s*(\S+)\s*$/;
const END_RE = /^# <<< multipass-run:\s*(\S+)\s*$/;
const LEGACY_RE = /^# Multipass instance:\s*(\S+)/;

export function extractBlocks(config: string): BlockRange[] {
	const lines = config.split('\n');
	const ranges: BlockRange[] = [];
	let i = 0;
	while (i < lines.length) {
		const begin = BEGIN_RE.exec(lines[i]);
		if (!begin) {
			i++;
			continue;
		}
		const instanceName = begin[1];
		let j = i + 1;
		while (j < lines.length) {
			const end = END_RE.exec(lines[j]);
			if (end && end[1] === instanceName) {
				break;
			}
			// Defensive: if we hit a fresh BEGIN before our END, treat the prior
			// block as ending one line above to avoid swallowing the next entry.
			if (BEGIN_RE.test(lines[j])) {
				j--;
				break;
			}
			j++;
		}
		const end = Math.min(j, lines.length - 1);
		ranges.push({ instanceName, start: i, end });
		i = end + 1;
	}
	return ranges;
}

export function countBlocks(config: string): number {
	return extractBlocks(config).length;
}

export function removeBlock(config: string, instanceName: string): string {
	const lines = config.split('\n');
	const matches = extractBlocks(config).filter((r) => r.instanceName === instanceName);
	if (matches.length === 0) {
		return config;
	}
	const drop = new Set<number>();
	for (const r of matches) {
		for (let i = r.start; i <= r.end; i++) {
			drop.add(i);
		}
		// Swallow one trailing blank line per block to keep config tidy.
		if (r.end + 1 < lines.length && lines[r.end + 1].trim() === '') {
			drop.add(r.end + 1);
		}
	}
	return lines.filter((_, idx) => !drop.has(idx)).join('\n');
}

export function addBlock(config: string, instanceName: string, body: string): string {
	const cleaned = removeBlock(config, instanceName).replace(/^\n+/, '');
	const block = [
		`${BLOCK_BEGIN_PREFIX}${instanceName}`,
		body.replace(/^\n+|\n+$/g, ''),
		`${BLOCK_END_PREFIX}${instanceName}`,
	].join('\n');
	if (cleaned.trim() === '') {
		return block + '\n';
	}
	return `${block}\n\n${cleaned}`;
}

/**
 * Detects pre-bracket-marker entries written by older versions of the
 * extension and rewraps them with the bracket markers.
 *
 * The legacy block starts at `# Multipass instance: <name>` and continues
 * until the next legacy/bracket marker, the next `Host ` line that does NOT
 * belong to this entry, or EOF.
 */
export function migrateLegacyBlocks(config: string): string {
	const lines = config.split('\n');
	const result: string[] = [];
	let i = 0;
	while (i < lines.length) {
		const legacy = LEGACY_RE.exec(lines[i]);
		if (!legacy) {
			result.push(lines[i]);
			i++;
			continue;
		}
		const instanceName = legacy[1];
		const sshHostName = `multipass-${instanceName}`;

		// Walk forward to find the end of the legacy block.
		let j = i + 1;
		let sawOurHost = false;
		while (j < lines.length) {
			const line = lines[j];
			if (LEGACY_RE.test(line) || BEGIN_RE.test(line) || END_RE.test(line)) {
				break;
			}
			const trimmed = line.trim();
			if (trimmed.startsWith('Host ')) {
				const hostsForUs = trimmed === `Host ${sshHostName}` || trimmed.startsWith(`Host ${sshHostName} `);
				if (sawOurHost && !hostsForUs) {
					break;
				}
				if (hostsForUs) {
					sawOurHost = true;
				} else if (sawOurHost) {
					break;
				}
			}
			j++;
		}
		// Trim trailing blanks so the new block looks clean.
		let end = j - 1;
		while (end > i && lines[end].trim() === '') {
			end--;
		}
		result.push(`${BLOCK_BEGIN_PREFIX}${instanceName}`);
		for (let k = i + 1; k <= end; k++) {
			result.push(lines[k]);
		}
		result.push(`${BLOCK_END_PREFIX}${instanceName}`);
		i = j;
	}
	return result.join('\n');
}

export function buildHostBody(opts: {
	hostAlias: string;
	hostName: string;
	identityFile: string;
	user?: string;
}): string {
	const user = opts.user ?? 'ubuntu';
	return [
		`Host ${opts.hostAlias}`,
		`  HostName ${opts.hostName}`,
		`  User ${user}`,
		`  IdentityFile ${opts.identityFile}`,
		`  StrictHostKeyChecking accept-new`,
		`  LogLevel ERROR`,
	].join('\n');
}

/**
 * Walks every bracketed multipass-run block and rewrites deprecated SSH
 * options inside the block body to their hardened equivalents:
 *   - `StrictHostKeyChecking no`        ->  `StrictHostKeyChecking accept-new`
 *   - `UserKnownHostsFile /dev/null`    ->  removed entirely
 *
 * Only touches lines inside managed blocks. User-authored entries elsewhere
 * in the config are untouched even if they happen to use the same options.
 */
export function normalizeManagedBlockBodies(config: string): string {
	const blocks = extractBlocks(config);
	if (blocks.length === 0) {
		return config;
	}
	const lines = config.split('\n');
	const inside = new Array<boolean>(lines.length).fill(false);
	for (const b of blocks) {
		for (let i = b.start; i <= b.end; i++) {
			inside[i] = true;
		}
	}
	const result: string[] = [];
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		if (!inside[i]) {
			result.push(line);
			continue;
		}
		if (/^\s*StrictHostKeyChecking\s+no\s*$/.test(line)) {
			const indent = line.match(/^(\s*)/)?.[1] ?? '  ';
			result.push(`${indent}StrictHostKeyChecking accept-new`);
			continue;
		}
		if (/^\s*UserKnownHostsFile\s+\/dev\/null\s*$/.test(line)) {
			continue;
		}
		result.push(line);
	}
	return result.join('\n');
}
