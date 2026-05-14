jest.mock('../../utils/multipassExecutable', () => ({
	runMultipassCommand: jest.fn(),
	spawnMultipassCommand: jest.fn(),
}));

import { PassThrough } from 'stream';

import { buildLaunchArgs, parseLaunchedInstanceName } from '../../commands/launch/launchInstance';
import { runMultipassCommand, spawnMultipassCommand } from '../../utils/multipassExecutable';

const runMultipassCommandMock = runMultipassCommand as jest.MockedFunction<typeof runMultipassCommand>;
const spawnMultipassCommandMock = spawnMultipassCommand as jest.MockedFunction<typeof spawnMultipassCommand>;

beforeEach(() => {
	runMultipassCommandMock.mockReset();
	spawnMultipassCommandMock.mockReset();
});

describe('buildLaunchArgs', () => {
	test('builds minimal args with just instance name', () => {
		const args = buildLaunchArgs({}, 'my-vm');
		expect(args).toEqual(['launch', '--name', 'my-vm']);
	});

	test('omits name arg when no instance name is provided', () => {
		const args = buildLaunchArgs({});
		expect(args).toEqual(['launch']);
	});

	test('includes image before --name', () => {
		const args = buildLaunchArgs({ image: 'jammy' }, 'my-vm');
		expect(args).toEqual(['launch', 'jammy', '--name', 'my-vm']);
	});

	test('includes cpus, memory, disk', () => {
		const args = buildLaunchArgs({ cpus: '4', memory: '8G', disk: '20G' }, 'vm');
		expect(args).toEqual(['launch', '--name', 'vm', '--cpus', '4', '--memory', '8G', '--disk', '20G']);
	});

	test('includes cloud-init path when specified', () => {
		const args = buildLaunchArgs({ cloudInitPath: '/tmp/test.yaml' }, 'vm');
		expect(args).toEqual(['launch', '--name', 'vm', '--cloud-init', '/tmp/test.yaml']);
	});

	test('includes all options together', () => {
		const args = buildLaunchArgs({
			image: 'noble',
			cpus: '2',
			memory: '4G',
			disk: '10G',
			cloudInitPath: '/tmp/ci.yaml',
		}, 'full-vm');
		expect(args).toEqual([
			'launch', 'noble', '--name', 'full-vm',
			'--cpus', '2', '--memory', '4G', '--disk', '10G',
			'--cloud-init', '/tmp/ci.yaml',
		]);
	});
});

describe('parseLaunchedInstanceName', () => {
	test('extracts the generated Multipass name from launch output', () => {
		expect(parseLaunchedInstanceName('Launched: careful-wallaby\n')).toBe('careful-wallaby');
	});

	test('returns undefined when output does not contain a launch name', () => {
		expect(parseLaunchedInstanceName('Creating instance...')).toBeUndefined();
	});
});

describe('launchInstance', () => {
	test('uses the shared multipass runner when no progress callback is provided', async () => {
		runMultipassCommandMock.mockResolvedValue({
			stdout: 'Launched: careful-wallaby\n',
			stderr: '',
		});

		const { launchInstance } = await import('../../commands/launch/launchInstance');
		const result = await launchInstance();

		expect(runMultipassCommandMock).toHaveBeenCalledWith(['launch']);
		expect(result).toEqual({
			success: true,
			instanceName: 'careful-wallaby',
			wasDownloading: false,
		});
	});

	test('uses the shared spawn helper when a progress callback is provided', async () => {
		const stdout = new PassThrough();
		const stderr = new PassThrough();
		const listeners = new Map<string, (arg: any) => void>();
		const proc = {
			stdout,
			stderr,
			on: jest.fn((event: string, handler: (arg: any) => void) => {
				listeners.set(event, handler);
				return proc;
			}),
		} as any;

		spawnMultipassCommandMock.mockResolvedValue(proc);

		const { launchInstance } = await import('../../commands/launch/launchInstance');
		const progress = jest.fn();
		const promise = launchInstance({ onProgress: progress });

		await Promise.resolve();
		stdout.write('Retrieving image: 42%\n');
		stdout.write('Launched: careful-wallaby\n');
		listeners.get('close')?.(0);

		await expect(promise).resolves.toEqual({
			success: true,
			instanceName: 'careful-wallaby',
			wasDownloading: true,
		});
		expect(spawnMultipassCommandMock).toHaveBeenCalledWith(['launch']);
		expect(progress).toHaveBeenCalledWith('Retrieving image: 42%', true);
	});
});
