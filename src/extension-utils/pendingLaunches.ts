import type { InstanceLists, MultipassInstance } from '../commands/listInstances';
import { PENDING_LAUNCH_STUCK_THRESHOLD_MS } from '../config/timings';

export const PENDING_LAUNCHES_STORAGE_KEY = 'multipassRun.pendingLaunches';

export type PendingLaunchStatus = 'launching' | 'stuck';

export interface PendingLaunchConfig {
	cpus?: string;
	memory?: string;
	disk?: string;
	image?: string;
}

export interface PendingLaunch {
	name: string;
	release?: string;
	startedAt: number;
	status: PendingLaunchStatus;
	config?: PendingLaunchConfig;
}

export interface MementoLike {
	get<T>(key: string, defaultValue: T): T;
	update(key: string, value: unknown): Thenable<void> | Promise<void>;
}

export class PendingLaunchStore {
	constructor(private readonly memento: MementoLike) {}

	list(): PendingLaunch[] {
		return this.memento.get<PendingLaunch[]>(PENDING_LAUNCHES_STORAGE_KEY, []);
	}

	async add(launch: PendingLaunch): Promise<void> {
		const all = this.list().filter((l) => l.name !== launch.name);
		all.push(launch);
		await this.memento.update(PENDING_LAUNCHES_STORAGE_KEY, all);
	}

	async remove(name: string): Promise<void> {
		const all = this.list();
		if (!all.some((l) => l.name === name)) {
			return;
		}
		const next = all.filter((l) => l.name !== name);
		await this.memento.update(PENDING_LAUNCHES_STORAGE_KEY, next);
	}

	async markStuck(name: string): Promise<void> {
		const all = this.list();
		const target = all.find((l) => l.name === name);
		if (!target || target.status === 'stuck') {
			return;
		}
		target.status = 'stuck';
		await this.memento.update(PENDING_LAUNCHES_STORAGE_KEY, all);
	}

	async clear(): Promise<void> {
		if (this.list().length === 0) {
			return;
		}
		await this.memento.update(PENDING_LAUNCHES_STORAGE_KEY, []);
	}
}

export function mergePendingIntoLists(
	lists: InstanceLists,
	pending: PendingLaunch[]
): InstanceLists {
	const realNames = new Set([
		...lists.active.map((i) => i.name),
		...lists.deleted.map((i) => i.name),
	]);
	const synthetic: MultipassInstance[] = pending
		.filter((p) => !realNames.has(p.name))
		.map((p) => ({
			name: p.name,
			state: p.status === 'stuck' ? 'Stuck' : 'Downloading Image',
			ipv4: '',
			release: p.release ?? '',
		}));
	return {
		...lists,
		active: [...synthetic, ...lists.active],
	};
}

export async function reconcilePending(
	store: PendingLaunchStore,
	lists: InstanceLists,
	now: number = Date.now()
): Promise<PendingLaunch[]> {
	const pending = store.list();
	const realNames = new Set(lists.active.map((i) => i.name));
	for (const p of pending) {
		if (realNames.has(p.name)) {
			await store.remove(p.name);
		} else if (p.status !== 'stuck' && now - p.startedAt > PENDING_LAUNCH_STUCK_THRESHOLD_MS) {
			await store.markStuck(p.name);
		}
	}
	return store.list();
}
