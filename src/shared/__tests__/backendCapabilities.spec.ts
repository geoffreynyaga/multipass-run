import { getBackendSupport } from '../backendCapabilities';

it.each(['qemu', 'hcs', 'hyperv', 'virtualbox'])('keeps documented snapshot and suspend support for %s', (driver) => {
	expect(getBackendSupport({ clientVersion: '1.17.0', daemonVersion: '1.17.0', driver, errors: [] })).toMatchObject({ snapshots: true, suspend: true });
});

it('marks both actions unsupported on AppleVZ despite a 1.17 client and daemon', () => {
	const support = getBackendSupport({ clientVersion: '1.17.0', daemonVersion: '1.17.0', driver: 'applevz', errors: [] });
	expect(support).toMatchObject({ snapshots: false, suspend: false });
	expect(support.snapshotReason).toContain('AppleVZ');
	expect(support.suspendReason).toContain('AppleVZ');
});

it.each([undefined, { clientVersion: '1.17.0', daemonVersion: null, driver: 'qemu', errors: [] }, { clientVersion: '1.17.0', daemonVersion: '1.17.0', driver: 'future-driver', errors: [] }])('does not infer supported operations from incomplete or unknown environment data', (environment) => {
	expect(getBackendSupport(environment)).toMatchObject({ snapshots: null, suspend: null });
});
