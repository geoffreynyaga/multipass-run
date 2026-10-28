jest.mock('../../utils/multipassExecutable', () => ({
	runMultipassCommand: jest.fn(),
}));

import { runMultipassCommand } from '../../utils/multipassExecutable';
import { getInstanceLists } from '../listInstances';

const runMultipassCommandMock = runMultipassCommand as jest.MockedFunction<typeof runMultipassCommand>;

beforeEach(() => {
	runMultipassCommandMock.mockReset();
	jest.spyOn(console, 'error').mockImplementation(() => undefined);
	runMultipassCommandMock.mockResolvedValue({
		stdout: JSON.stringify({
			list: [
				{ name: 'vm-running', state: 'Running', ipv4: ['10.0.0.2'], release: 'Ubuntu 24.04 LTS' },
				{ name: 'vm-deleted', state: 'Deleted', ipv4: [], release: 'Ubuntu 22.04 LTS' },
			],
		}),
		stderr: '',
	});
});

afterEach(() => {
	jest.restoreAllMocks();
	jest.clearAllMocks();
});

describe('getInstanceLists', () => {
	test('uses the resolved multipass executable and parses active and deleted instances', async () => {
		const lists = await getInstanceLists();

		expect(runMultipassCommandMock).toHaveBeenCalledWith(
			['list', '--format', 'json'], {},
		);
		expect(lists.active).toEqual([
			{
				name: 'vm-running',
				state: 'Running',
				ipv4: '10.0.0.2',
				release: 'Ubuntu 24.04 LTS',
			},
		]);
		expect(lists.deleted).toEqual([
			{
				name: 'vm-deleted',
				state: 'Deleted',
				ipv4: '',
				release: 'Ubuntu 22.04 LTS',
			},
		]);
	});

	test('reports not-installed when the resolved executable cannot be executed', async () => {
		runMultipassCommandMock.mockRejectedValueOnce(new Error('spawn /snap/bin/multipass ENOENT'));

		const lists = await getInstanceLists();

		expect(lists.error).toEqual({
			type: 'not-installed',
			message: 'Multipass is not installed on your system',
		});
	});
});
it('preserves zone membership and availability, including Unavailable VMs and null zones', async () => {
	runMultipassCommandMock.mockResolvedValueOnce({ stdout: JSON.stringify({ list: [
		{ name: 'outage-vm', state: 'Unavailable', zone: { name: 'zone2', available: false } },
		{ name: 'legacy-vm', state: 'Stopped', zone: null },
	] }), stderr: '' });
	const result = await getInstanceLists();
	expect(result.active[0]).toMatchObject({ state: 'Unavailable', zone: { name: 'zone2', available: false } });
	expect(result.active[1].zone).toBeUndefined();
});

it('reports malformed VM lists rather than claiming a zone has no VMs', async () => {
	runMultipassCommandMock.mockResolvedValueOnce({ stdout: '{}', stderr: '' });
	expect((await getInstanceLists()).error).toBeDefined();
});
