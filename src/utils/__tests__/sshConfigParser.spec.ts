import {
	BLOCK_BEGIN_PREFIX,
	BLOCK_END_PREFIX,
	addBlock,
	buildHostBody,
	countBlocks,
	extractBlocks,
	migrateLegacyBlocks,
	normalizeManagedBlockBodies,
	removeBlock,
} from '../sshConfigParser';

const sample = (instance: string, ip: string, key: string) =>
	[
		`${BLOCK_BEGIN_PREFIX}${instance}`,
		`Host multipass-${instance}`,
		`  HostName ${ip}`,
		`  User ubuntu`,
		`  IdentityFile ${key}`,
		`  StrictHostKeyChecking accept-new`,
		`  LogLevel ERROR`,
		`${BLOCK_END_PREFIX}${instance}`,
	].join('\n');

describe('extractBlocks', () => {
	test('returns empty array for empty config', () => {
		expect(extractBlocks('')).toEqual([]);
	});

	test('returns empty array for config without markers', () => {
		const cfg = ['Host bastion', '  HostName bastion.tld'].join('\n');
		expect(extractBlocks(cfg)).toEqual([]);
	});

	test('finds a single block at start of file', () => {
		const cfg = sample('a', '10.0.0.1', '/k');
		expect(extractBlocks(cfg)).toEqual([{ instanceName: 'a', start: 0, end: 7 }]);
	});

	test('finds a single block in middle of file', () => {
		const cfg = ['Host work', '', sample('a', '10.0.0.1', '/k'), '', 'Host home'].join('\n');
		const blocks = extractBlocks(cfg);
		expect(blocks).toHaveLength(1);
		expect(blocks[0].instanceName).toBe('a');
		expect(blocks[0].start).toBe(2);
	});

	test('finds multiple blocks separated by user content', () => {
		const cfg = [
			sample('a', '10.0.0.1', '/k'),
			'',
			'Host work',
			'  HostName work.tld',
			'',
			sample('b', '10.0.0.2', '/k'),
		].join('\n');
		expect(extractBlocks(cfg).map((b) => b.instanceName)).toEqual(['a', 'b']);
	});

	test('tolerates user scribbles inside the block', () => {
		const cfg = [
			`${BLOCK_BEGIN_PREFIX}a`,
			'# user-added comment',
			'Host multipass-a',
			'  HostName 10.0.0.1',
			'  ProxyJump bastion',
			`${BLOCK_END_PREFIX}a`,
		].join('\n');
		expect(extractBlocks(cfg)).toEqual([{ instanceName: 'a', start: 0, end: 5 }]);
	});

	test('treats unmatched BEGIN as block extending to EOF', () => {
		const cfg = [`${BLOCK_BEGIN_PREFIX}a`, 'Host multipass-a', '  HostName 10.0.0.1'].join('\n');
		const blocks = extractBlocks(cfg);
		expect(blocks).toHaveLength(1);
		expect(blocks[0].instanceName).toBe('a');
		expect(blocks[0].end).toBe(2);
	});

	test('does not match END whose name differs from BEGIN', () => {
		const cfg = [`${BLOCK_BEGIN_PREFIX}a`, 'Host x', `${BLOCK_END_PREFIX}b`, 'Host y'].join('\n');
		const blocks = extractBlocks(cfg);
		expect(blocks[0].instanceName).toBe('a');
	});

	test('handles back-to-back blocks with no separator', () => {
		const cfg = [sample('a', '1', '/k'), sample('b', '2', '/k')].join('\n');
		expect(extractBlocks(cfg).map((b) => b.instanceName)).toEqual(['a', 'b']);
	});

	test('block boundaries do not include surrounding blank lines', () => {
		const cfg = ['', '', sample('a', '1', '/k'), '', ''].join('\n');
		const block = extractBlocks(cfg)[0];
		expect(cfg.split('\n')[block.start]).toBe(`${BLOCK_BEGIN_PREFIX}a`);
		expect(cfg.split('\n')[block.end]).toBe(`${BLOCK_END_PREFIX}a`);
	});

	test('rejects markers that contain extra junk after instance name', () => {
		// "# >>> multipass-run: a junk" should NOT match (regex requires single token)
		const cfg = [`${BLOCK_BEGIN_PREFIX}a junk`, 'Host x', `${BLOCK_END_PREFIX}a`].join('\n');
		expect(extractBlocks(cfg)).toEqual([]);
	});

	test('handles instance names with hyphens, underscores, digits', () => {
		const cfg = sample('vm_test-1_a23', '10.0.0.1', '/k');
		const blocks = extractBlocks(cfg);
		expect(blocks).toHaveLength(1);
		expect(blocks[0].instanceName).toBe('vm_test-1_a23');
	});
});

describe('countBlocks', () => {
	test('counts all bracketed blocks', () => {
		const cfg = [sample('a', '1', '/k'), sample('b', '2', '/k')].join('\n\n');
		expect(countBlocks(cfg)).toBe(2);
	});

	test('returns 0 on empty config', () => {
		expect(countBlocks('')).toBe(0);
	});

	test('returns 0 when no managed blocks present', () => {
		expect(countBlocks(['Host bastion', '  HostName bastion.tld'].join('\n'))).toBe(0);
	});
});

describe('removeBlock', () => {
	test('removes the requested block and leaves others', () => {
		const cfg = [sample('a', '1', '/k'), '', sample('b', '2', '/k')].join('\n');
		const after = removeBlock(cfg, 'a');
		expect(after).not.toContain('multipass-a');
		expect(after).toContain('multipass-b');
		expect(countBlocks(after)).toBe(1);
	});

	test('is a true no-op for unknown instance', () => {
		const cfg = sample('a', '1', '/k');
		expect(removeBlock(cfg, 'ghost')).toBe(cfg);
	});

	test('survives manual scribbles inside the block', () => {
		const cfg = [
			`${BLOCK_BEGIN_PREFIX}a`,
			'# user wrote a note here',
			'Host multipass-a',
			'  HostName 10.0.0.1',
			'  ServerAliveInterval 60',
			`${BLOCK_END_PREFIX}a`,
			'',
			'Host other',
			'  HostName other.tld',
		].join('\n');
		const after = removeBlock(cfg, 'a');
		expect(after).not.toContain('multipass-a');
		expect(after).not.toContain('user wrote a note');
		expect(after).toContain('Host other');
	});

	test('preserves preceding user entries unchanged', () => {
		const cfg = ['Host work', '  HostName work.tld', '', sample('a', '1', '/k')].join('\n');
		const after = removeBlock(cfg, 'a');
		expect(after).toContain('Host work');
		expect(after).toContain('  HostName work.tld');
	});

	test('removes consecutive blocks with same name (defensive: corrupt state)', () => {
		const cfg = [sample('a', '1', '/k'), '', sample('a', '2', '/k')].join('\n');
		const after = removeBlock(cfg, 'a');
		expect(countBlocks(after)).toBe(0);
	});

	test('handles config without trailing newline', () => {
		const cfg = sample('a', '1', '/k');
		const after = removeBlock(cfg, 'a');
		expect(after.trim()).toBe('');
	});

	test('idempotent across repeated calls', () => {
		const cfg = sample('a', '1', '/k');
		const once = removeBlock(cfg, 'a');
		const twice = removeBlock(once, 'a');
		expect(twice).toBe(once);
	});
});

describe('addBlock', () => {
	const body = (ip: string) =>
		buildHostBody({
			hostAlias: 'multipass-a',
			hostName: ip,
			identityFile: '/key',
		});

	test('adds a new block to an empty config', () => {
		const after = addBlock('', 'a', body('10.0.0.1'));
		expect(after).toContain(`${BLOCK_BEGIN_PREFIX}a`);
		expect(after).toContain('Host multipass-a');
		expect(after).toContain(`${BLOCK_END_PREFIX}a`);
		expect(countBlocks(after)).toBe(1);
	});

	test('replaces an existing block with the same name (idempotent)', () => {
		let cfg = addBlock('', 'a', body('10.0.0.1'));
		cfg = addBlock(cfg, 'a', body('10.0.0.99'));
		expect(countBlocks(cfg)).toBe(1);
		expect(cfg).toContain('10.0.0.99');
		expect(cfg).not.toContain('10.0.0.1');
	});

	test('adds without disturbing other managed blocks', () => {
		let cfg = addBlock('', 'a', body('10.0.0.1'));
		cfg = addBlock(cfg, 'b', buildHostBody({
			hostAlias: 'multipass-b',
			hostName: '10.0.0.2',
			identityFile: '/key',
		}));
		expect(countBlocks(cfg)).toBe(2);
		expect(cfg).toContain('Host multipass-a');
		expect(cfg).toContain('Host multipass-b');
	});

	test('preserves unrelated user entries', () => {
		const userCfg = ['Host work', '  HostName work.tld'].join('\n');
		const after = addBlock(userCfg, 'a', body('10.0.0.1'));
		expect(after).toContain('Host work');
		expect(after).toContain('  HostName work.tld');
		expect(after).toContain('Host multipass-a');
	});

	test('the new block uses accept-new, not no', () => {
		const after = addBlock('', 'a', body('10.0.0.1'));
		expect(after).toContain('StrictHostKeyChecking accept-new');
		expect(after).not.toMatch(/StrictHostKeyChecking\s+no\b/);
	});

	test('the new block does NOT include UserKnownHostsFile /dev/null', () => {
		const after = addBlock('', 'a', body('10.0.0.1'));
		expect(after).not.toContain('/dev/null');
	});
});

describe('buildHostBody', () => {
	test('default user is ubuntu', () => {
		const body = buildHostBody({
			hostAlias: 'multipass-a',
			hostName: '10.0.0.1',
			identityFile: '/key',
		});
		expect(body).toContain('User ubuntu');
	});

	test('honours custom user', () => {
		const body = buildHostBody({
			hostAlias: 'multipass-a',
			hostName: '10.0.0.1',
			identityFile: '/key',
			user: 'fedora',
		});
		expect(body).toContain('User fedora');
	});

	test('emits accept-new and LogLevel ERROR', () => {
		const body = buildHostBody({
			hostAlias: 'multipass-a',
			hostName: '10.0.0.1',
			identityFile: '/key',
		});
		expect(body).toContain('StrictHostKeyChecking accept-new');
		expect(body).toContain('LogLevel ERROR');
	});
});

describe('migrateLegacyBlocks', () => {
	test('rewrites a single legacy block with bracket markers', () => {
		const cfg = [
			'# Multipass instance: a (managed by multipass-run extension)',
			'Host multipass-a',
			'  HostName 10.0.0.1',
			'  User ubuntu',
			'  IdentityFile /home/u/.ssh/multipass_id_rsa',
			'  StrictHostKeyChecking no',
			'  UserKnownHostsFile /dev/null',
			'  LogLevel ERROR',
		].join('\n');
		const after = migrateLegacyBlocks(cfg);
		expect(after).toContain(`${BLOCK_BEGIN_PREFIX}a`);
		expect(after).toContain(`${BLOCK_END_PREFIX}a`);
		expect(after).toContain('Host multipass-a');
		expect(extractBlocks(after)).toHaveLength(1);
	});

	test('handles multiple legacy blocks in sequence', () => {
		const cfg = [
			'# Multipass instance: a (managed by multipass-run extension)',
			'Host multipass-a',
			'  HostName 10.0.0.1',
			'',
			'# Multipass instance: b (managed by multipass-run extension)',
			'Host multipass-b',
			'  HostName 10.0.0.2',
		].join('\n');
		const after = migrateLegacyBlocks(cfg);
		expect(extractBlocks(after).map((b) => b.instanceName).sort()).toEqual(['a', 'b']);
	});

	test('does not re-wrap blocks that already use bracket markers', () => {
		const cfg = [
			sample('a', '10.0.0.1', '/k'),
			'',
			'# Multipass instance: b (managed by multipass-run extension)',
			'Host multipass-b',
			'  HostName 10.0.0.2',
		].join('\n');
		const after = migrateLegacyBlocks(cfg);
		expect(extractBlocks(after).map((b) => b.instanceName).sort()).toEqual(['a', 'b']);
		expect(after.split(`${BLOCK_BEGIN_PREFIX}a`).length).toBe(2);
	});

	test('preserves unrelated entries', () => {
		const cfg = [
			'Host bastion',
			'  HostName bastion.tld',
			'',
			'# Multipass instance: a (managed by multipass-run extension)',
			'Host multipass-a',
			'  HostName 10.0.0.1',
			'',
			'Host work',
			'  HostName work.tld',
		].join('\n');
		const after = migrateLegacyBlocks(cfg);
		expect(after).toContain('Host bastion');
		expect(after).toContain('Host work');
		expect(extractBlocks(after).map((b) => b.instanceName)).toEqual(['a']);
	});

	test('is idempotent when run twice', () => {
		const cfg = [
			'# Multipass instance: a (managed by multipass-run extension)',
			'Host multipass-a',
			'  HostName 10.0.0.1',
		].join('\n');
		const once = migrateLegacyBlocks(cfg);
		const twice = migrateLegacyBlocks(once);
		expect(twice).toBe(once);
	});

	test('returns input unchanged when no legacy markers present', () => {
		const cfg = ['Host work', '  HostName work.tld'].join('\n');
		expect(migrateLegacyBlocks(cfg)).toBe(cfg);
	});

	test('migrate then add then remove leaves no trace', () => {
		let cfg = [
			'# Multipass instance: legacy (managed by multipass-run extension)',
			'Host multipass-legacy',
			'  HostName 10.0.0.5',
		].join('\n');
		cfg = migrateLegacyBlocks(cfg);
		expect(countBlocks(cfg)).toBe(1);
		cfg = addBlock(
			cfg,
			'fresh',
			buildHostBody({ hostAlias: 'multipass-fresh', hostName: '10.0.0.6', identityFile: '/k' })
		);
		expect(countBlocks(cfg)).toBe(2);
		cfg = removeBlock(cfg, 'legacy');
		cfg = removeBlock(cfg, 'fresh');
		expect(countBlocks(cfg)).toBe(0);
		expect(cfg).not.toContain('multipass-legacy');
		expect(cfg).not.toContain('multipass-fresh');
	});

	test('legacy block at end of file (no trailing newline)', () => {
		const cfg =
			'# Multipass instance: a (managed by multipass-run extension)\n' +
			'Host multipass-a\n' +
			'  HostName 10.0.0.1';
		const after = migrateLegacyBlocks(cfg);
		expect(extractBlocks(after)).toHaveLength(1);
	});
});

describe('normalizeManagedBlockBodies', () => {
	test('replaces StrictHostKeyChecking no with accept-new inside managed block', () => {
		const cfg = [
			`${BLOCK_BEGIN_PREFIX}vm`,
			'Host multipass-vm',
			'  HostName 10.0.0.1',
			'  StrictHostKeyChecking no',
			'  UserKnownHostsFile /dev/null',
			`${BLOCK_END_PREFIX}vm`,
		].join('\n');
		const after = normalizeManagedBlockBodies(cfg);
		expect(after).toContain('StrictHostKeyChecking accept-new');
		expect(after).not.toMatch(/StrictHostKeyChecking\s+no\b/);
		expect(after).not.toContain('/dev/null');
	});

	test('preserves indentation when rewriting StrictHostKeyChecking', () => {
		const cfg = [
			`${BLOCK_BEGIN_PREFIX}vm`,
			'Host multipass-vm',
			'    StrictHostKeyChecking no',
			`${BLOCK_END_PREFIX}vm`,
		].join('\n');
		const after = normalizeManagedBlockBodies(cfg);
		expect(after).toContain('    StrictHostKeyChecking accept-new');
	});

	test('does not touch the same options outside any managed block', () => {
		const cfg = [
			'Host bastion',
			'  StrictHostKeyChecking no',
			'  UserKnownHostsFile /dev/null',
			'',
			`${BLOCK_BEGIN_PREFIX}vm`,
			'Host multipass-vm',
			'  StrictHostKeyChecking no',
			`${BLOCK_END_PREFIX}vm`,
		].join('\n');
		const after = normalizeManagedBlockBodies(cfg);
		// Bastion (user) entry kept verbatim
		const bastionSection = after.split(BLOCK_BEGIN_PREFIX)[0];
		expect(bastionSection).toContain('StrictHostKeyChecking no');
		expect(bastionSection).toContain('UserKnownHostsFile /dev/null');
		// Managed block normalized
		const managedSection = after.split(BLOCK_BEGIN_PREFIX)[1];
		expect(managedSection).toContain('StrictHostKeyChecking accept-new');
		expect(managedSection).not.toContain('/dev/null');
	});

	test('is a no-op when block already uses hardened options', () => {
		const cfg = [
			`${BLOCK_BEGIN_PREFIX}vm`,
			'Host multipass-vm',
			'  StrictHostKeyChecking accept-new',
			`${BLOCK_END_PREFIX}vm`,
		].join('\n');
		expect(normalizeManagedBlockBodies(cfg)).toBe(cfg);
	});

	test('returns input unchanged when there are no managed blocks', () => {
		const cfg = ['Host work', '  StrictHostKeyChecking no'].join('\n');
		expect(normalizeManagedBlockBodies(cfg)).toBe(cfg);
	});

	test('idempotent across repeated calls', () => {
		const cfg = [
			`${BLOCK_BEGIN_PREFIX}vm`,
			'Host multipass-vm',
			'  StrictHostKeyChecking no',
			'  UserKnownHostsFile /dev/null',
			`${BLOCK_END_PREFIX}vm`,
		].join('\n');
		const once = normalizeManagedBlockBodies(cfg);
		const twice = normalizeManagedBlockBodies(once);
		expect(twice).toBe(once);
	});

	test('migrate -> normalize chain rewrites legacy block end-to-end', () => {
		const legacy = [
			'# Multipass instance: vm-1 (managed by multipass-run extension)',
			'Host multipass-vm-1',
			'  HostName 10.0.0.1',
			'  User ubuntu',
			'  IdentityFile /Users/u/.ssh/multipass_id_rsa',
			'  StrictHostKeyChecking no',
			'  UserKnownHostsFile /dev/null',
			'  LogLevel ERROR',
		].join('\n');
		const after = normalizeManagedBlockBodies(migrateLegacyBlocks(legacy));
		expect(after).toContain(`${BLOCK_BEGIN_PREFIX}vm-1`);
		expect(after).toContain(`${BLOCK_END_PREFIX}vm-1`);
		expect(after).toContain('StrictHostKeyChecking accept-new');
		expect(after).not.toMatch(/StrictHostKeyChecking\s+no\b/);
		expect(after).not.toContain('/dev/null');
		// IdentityFile preserved (we don't force key rotation on existing VMs)
		expect(after).toContain('IdentityFile /Users/u/.ssh/multipass_id_rsa');
	});

	test('only touches multipass-run blocks even if user has many', () => {
		const cfg = [
			'Host server-a',
			'  StrictHostKeyChecking no',
			'',
			`${BLOCK_BEGIN_PREFIX}vm-1`,
			'Host multipass-vm-1',
			'  StrictHostKeyChecking no',
			`${BLOCK_END_PREFIX}vm-1`,
			'',
			'Host server-b',
			'  UserKnownHostsFile /dev/null',
			'',
			`${BLOCK_BEGIN_PREFIX}vm-2`,
			'Host multipass-vm-2',
			'  UserKnownHostsFile /dev/null',
			'  StrictHostKeyChecking no',
			`${BLOCK_END_PREFIX}vm-2`,
		].join('\n');
		const after = normalizeManagedBlockBodies(cfg);
		expect(after.match(/StrictHostKeyChecking\s+no\b/g)?.length).toBe(1); // only server-a's
		expect(after.match(/\/dev\/null/g)?.length).toBe(1); // only server-b's
		expect(after.match(/StrictHostKeyChecking accept-new/g)?.length).toBe(2);
	});
});

describe('cross-helper invariants', () => {
	test('count(after addBlock) == count(before) + 1 when name is fresh', () => {
		const cfg = sample('a', '1', '/k');
		const before = countBlocks(cfg);
		const after = addBlock(
			cfg,
			'b',
			buildHostBody({ hostAlias: 'multipass-b', hostName: '2', identityFile: '/k' })
		);
		expect(countBlocks(after)).toBe(before + 1);
	});

	test('count(after removeBlock(known)) == count(before) - 1', () => {
		const cfg = [sample('a', '1', '/k'), sample('b', '2', '/k')].join('\n\n');
		expect(countBlocks(removeBlock(cfg, 'a'))).toBe(1);
	});

	test('extractBlocks output is sorted by appearance order', () => {
		const cfg = [sample('z', '1', '/k'), '', sample('a', '2', '/k')].join('\n');
		expect(extractBlocks(cfg).map((b) => b.instanceName)).toEqual(['z', 'a']);
	});
});
