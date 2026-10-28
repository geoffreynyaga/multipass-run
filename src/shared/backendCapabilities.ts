import type { MultipassEnvironment } from '../utils/multipassVersion';

export interface BackendSupport {
	snapshots: boolean | null;
	suspend: boolean | null;
	snapshotReason: string;
	suspendReason: string;
}

/** Multipass 1.17's driver matrix; unknown never implies supported. */
export function getBackendSupport(environment?: MultipassEnvironment): BackendSupport {
	if (!environment?.driver || !environment.daemonVersion) {
		return {
			snapshots: null, suspend: null,
			snapshotReason: 'Backend support unknown. Run Show Environment to retry.',
			suspendReason: 'Backend support unknown. Run Show Environment to retry.',
		};
	}
	if (environment.driver === 'applevz') {
		return {
			snapshots: false, suspend: false,
			snapshotReason: 'Snapshots are unavailable on AppleVZ in Multipass 1.17.',
			suspendReason: 'Suspend is unavailable on AppleVZ in Multipass 1.17.',
		};
	}
	if (['qemu', 'hcs', 'hyperv', 'virtualbox'].includes(environment.driver)) {
		return { snapshots: true, suspend: true, snapshotReason: '', suspendReason: '' };
	}
	return {
		snapshots: null, suspend: null,
		snapshotReason: `Snapshot support is unknown for driver ${environment.driver}.`,
		suspendReason: `Suspend support is unknown for driver ${environment.driver}.`,
	};
}
