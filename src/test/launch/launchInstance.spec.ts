import { buildLaunchArgs, parseLaunchedInstanceName } from '../../commands/launch/launchInstance';

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
