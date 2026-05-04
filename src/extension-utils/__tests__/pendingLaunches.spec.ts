import {
	PendingLaunchStore,
	PENDING_LAUNCHES_STORAGE_KEY,
	STUCK_THRESHOLD_MS,
	mergePendingIntoLists,
	reconcilePending,
	type MementoLike,
	type PendingLaunch,
} from '../pendingLaunches';
import type { InstanceLists } from '../../commands/listInstances';

class MemoryMemento implements MementoLike {
	public writes = 0;
	private store = new Map<string, unknown>();
	get<T>(key: string, defaultValue: T): T {
		return (this.store.get(key) as T) ?? defaultValue;
	}
	async update(key: string, value: unknown): Promise<void> {
		this.writes++;
		this.store.set(key, value);
	}
}

function makeLaunch(overrides: Partial<PendingLaunch> = {}): PendingLaunch {
	return {
		name: 'vm-test',
		startedAt: 1_000_000,
		status: 'launching',
		...overrides,
	};
}

describe('PendingLaunchStore', () => {
	test('add persists under storage key', async () => {
		const m = new MemoryMemento();
		const store = new PendingLaunchStore(m);
		const launch = makeLaunch({ name: 'vm-1', release: 'Ubuntu 24.04 LTS' });
		await store.add(launch);
		expect(m.get(PENDING_LAUNCHES_STORAGE_KEY, [])).toEqual([launch]);
	});

	test('add replaces existing entry by name', async () => {
		const store = new PendingLaunchStore(new MemoryMemento());
		await store.add(makeLaunch({ name: 'vm-1', startedAt: 1 }));
		await store.add(makeLaunch({ name: 'vm-1', startedAt: 2 }));
		expect(store.list()).toHaveLength(1);
		expect(store.list()[0].startedAt).toBe(2);
	});

	test('remove deletes by name', async () => {
		const store = new PendingLaunchStore(new MemoryMemento());
		await store.add(makeLaunch({ name: 'a' }));
		await store.add(makeLaunch({ name: 'b' }));
		await store.remove('a');
		expect(store.list().map((l) => l.name)).toEqual(['b']);
	});

	test('remove of unknown name is a no-op (no write)', async () => {
		const m = new MemoryMemento();
		const store = new PendingLaunchStore(m);
		await store.add(makeLaunch({ name: 'a' }));
		const writesBefore = m.writes;
		await store.remove('ghost');
		expect(m.writes).toBe(writesBefore);
	});

	test('markStuck flips status', async () => {
		const store = new PendingLaunchStore(new MemoryMemento());
		await store.add(makeLaunch({ name: 'a' }));
		await store.markStuck('a');
		expect(store.list()[0].status).toBe('stuck');
	});

	test('markStuck on already-stuck is no-op (no write)', async () => {
		const m = new MemoryMemento();
		const store = new PendingLaunchStore(m);
		await store.add(makeLaunch({ name: 'a', status: 'stuck' }));
		const writesBefore = m.writes;
		await store.markStuck('a');
		expect(m.writes).toBe(writesBefore);
	});

	test('markStuck on missing name is silent', async () => {
		const store = new PendingLaunchStore(new MemoryMemento());
		await expect(store.markStuck('ghost')).resolves.toBeUndefined();
		expect(store.list()).toEqual([]);
	});

	test('clear removes everything', async () => {
		const store = new PendingLaunchStore(new MemoryMemento());
		await store.add(makeLaunch({ name: 'a' }));
		await store.add(makeLaunch({ name: 'b' }));
		await store.clear();
		expect(store.list()).toEqual([]);
	});

	test('clear on empty is no-op (no write)', async () => {
		const m = new MemoryMemento();
		const store = new PendingLaunchStore(m);
		const writesBefore = m.writes;
		await store.clear();
		expect(m.writes).toBe(writesBefore);
	});

	test('survives reload across new store instances on same memento', async () => {
		const m = new MemoryMemento();
		const a = new PendingLaunchStore(m);
		await a.add(makeLaunch({ name: 'persisted' }));
		const b = new PendingLaunchStore(m);
		expect(b.list().map((l) => l.name)).toEqual(['persisted']);
	});
});

describe('mergePendingIntoLists', () => {
	const baseLists: InstanceLists = {
		active: [
			{ name: 'real', state: 'Running', ipv4: '10.0.0.1', release: 'Ubuntu 24.04 LTS' },
		],
		deleted: [],
	};

	test('prepends pending entries with Downloading Image state', () => {
		const merged = mergePendingIntoLists(baseLists, [
			makeLaunch({ name: 'pending1', release: 'Ubuntu 22.04 LTS' }),
		]);
		expect(merged.active).toHaveLength(2);
		expect(merged.active[0]).toMatchObject({
			name: 'pending1',
			state: 'Downloading Image',
			release: 'Ubuntu 22.04 LTS',
			ipv4: '',
		});
		expect(merged.active[1].name).toBe('real');
	});

	test('renders stuck entries as state Stuck', () => {
		const merged = mergePendingIntoLists(baseLists, [
			makeLaunch({ name: 'p', status: 'stuck' }),
		]);
		expect(merged.active[0].state).toBe('Stuck');
	});

	test('drops pending whose name already appears in active', () => {
		const merged = mergePendingIntoLists(baseLists, [
			makeLaunch({ name: 'real' }),
		]);
		expect(merged.active).toHaveLength(1);
		expect(merged.active[0].state).toBe('Running');
	});

	test('drops pending whose name appears in deleted', () => {
		const lists: InstanceLists = {
			active: [],
			deleted: [{ name: 'old', state: 'Deleted', ipv4: '', release: 'Ubuntu' }],
		};
		const merged = mergePendingIntoLists(lists, [makeLaunch({ name: 'old' })]);
		expect(merged.active).toEqual([]);
	});

	test('preserves the input lists immutably', () => {
		const original = {
			active: [...baseLists.active],
			deleted: [...baseLists.deleted],
		};
		mergePendingIntoLists(baseLists, [makeLaunch({ name: 'pending' })]);
		expect(baseLists.active).toEqual(original.active);
		expect(baseLists.deleted).toEqual(original.deleted);
	});

	test('preserves error field if present', () => {
		const lists: InstanceLists = {
			active: [],
			deleted: [],
			error: { type: 'other', message: 'boom' },
		};
		const merged = mergePendingIntoLists(lists, []);
		expect(merged.error).toEqual({ type: 'other', message: 'boom' });
	});
});

describe('reconcilePending', () => {
	test('removes pending that now appears in real list', async () => {
		const store = new PendingLaunchStore(new MemoryMemento());
		await store.add(makeLaunch({ name: 'vm1', startedAt: Date.now() }));
		const lists: InstanceLists = {
			active: [{ name: 'vm1', state: 'Running', ipv4: '10.0.0.1', release: 'Ubuntu' }],
			deleted: [],
		};
		await reconcilePending(store, lists);
		expect(store.list()).toEqual([]);
	});

	test('marks pending as stuck after STUCK_THRESHOLD_MS', async () => {
		const store = new PendingLaunchStore(new MemoryMemento());
		const startedAt = 1_000_000;
		await store.add(makeLaunch({ name: 'vm1', startedAt }));
		const now = startedAt + STUCK_THRESHOLD_MS + 1;
		await reconcilePending(store, { active: [], deleted: [] }, now);
		expect(store.list()[0].status).toBe('stuck');
	});

	test('does not flip already-stuck entries (no extra writes)', async () => {
		const m = new MemoryMemento();
		const store = new PendingLaunchStore(m);
		await store.add(makeLaunch({ name: 'vm1', startedAt: 0, status: 'stuck' }));
		const writesBefore = m.writes;
		await reconcilePending(store, { active: [], deleted: [] }, Date.now());
		expect(m.writes).toBe(writesBefore);
	});

	test('leaves fresh launching pending alone', async () => {
		const store = new PendingLaunchStore(new MemoryMemento());
		const now = Date.now();
		await store.add(makeLaunch({ name: 'vm1', startedAt: now - 1000 }));
		await reconcilePending(store, { active: [], deleted: [] }, now);
		expect(store.list()[0].status).toBe('launching');
	});

	test('handles mixed: completed, stuck, fresh — all in one pass', async () => {
		const store = new PendingLaunchStore(new MemoryMemento());
		const now = 10_000_000;
		await store.add(makeLaunch({ name: 'done', startedAt: now - 1000 }));
		await store.add(makeLaunch({ name: 'old', startedAt: now - STUCK_THRESHOLD_MS - 1 }));
		await store.add(makeLaunch({ name: 'fresh', startedAt: now - 1000 }));
		const lists: InstanceLists = {
			active: [{ name: 'done', state: 'Running', ipv4: '', release: '' }],
			deleted: [],
		};
		const remaining = await reconcilePending(store, lists, now);
		expect(remaining.map((p) => [p.name, p.status])).toEqual(
			expect.arrayContaining([
				['old', 'stuck'],
				['fresh', 'launching'],
			])
		);
		expect(remaining.find((p) => p.name === 'done')).toBeUndefined();
	});
});
