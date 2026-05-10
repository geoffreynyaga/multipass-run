jest.mock('../../utils/multipassExecutable', () => ({
	runMultipassCommand: jest.fn(),
}));

import { getInstanceInfo } from '../getInstanceInfo';
import { runMultipassCommand } from '../../utils/multipassExecutable';

const runMultipassCommandMock = runMultipassCommand as jest.MockedFunction<typeof runMultipassCommand>;

beforeEach(() => {
	runMultipassCommandMock.mockReset();
	jest.spyOn(console, 'error').mockImplementation(() => undefined);
	runMultipassCommandMock.mockResolvedValue({
		stdout: JSON.stringify({
			info: {
				'test-vm': {
					state: 'Running',
					zone: { name: 'default' },
					snapshot_count: '2',
					ipv4: ['10.0.0.10'],
					release: 'Ubuntu 24.04 LTS',
					image_release: 'noble',
					cpu_count: '2',
					load: ['0.10', '0.20', '0.30'],
					disks: { sda1: { used: String(2 * 1024 * 1024 * 1024), total: String(8 * 1024 * 1024 * 1024) } },
					memory: { used: String(1 * 1024 * 1024 * 1024), total: String(4 * 1024 * 1024 * 1024) },
					mounts: {
						'/home/ubuntu/project': { source_path: '/host/project' },
					},
				},
			},
		}),
		stderr: '',
	});
});

afterEach(() => {
	jest.restoreAllMocks();
	jest.clearAllMocks();
});

describe('getInstanceInfo', () => {
	test('uses the shared multipass runner and maps info fields', async () => {
		const info = await getInstanceInfo('test-vm');

		expect(runMultipassCommandMock).toHaveBeenCalledWith(['info', 'test-vm', '--format', 'json']);
		expect(info).toEqual({
			name: 'test-vm',
			state: 'Running',
			zone: 'default',
			snapshots: 2,
			ipv4: '10.0.0.10',
			release: 'Ubuntu 24.04 LTS',
			imageRelease: 'noble',
			cpus: '2',
			load: '0.10 0.20 0.30',
			diskUsage: '2.00 GB / 8.00 GB',
			memoryUsage: '1.00 GB / 4.00 GB',
			mounts: '/host/project => /home/ubuntu/project',
			mountsList: [{ source: '/host/project', target: '/home/ubuntu/project' }],
		});
	});

	test('returns null when the shared runner fails', async () => {
		runMultipassCommandMock.mockRejectedValueOnce(new Error('boom'));

		await expect(getInstanceInfo('test-vm')).resolves.toBeNull();
	});
});