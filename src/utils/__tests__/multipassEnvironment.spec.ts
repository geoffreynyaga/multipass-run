jest.mock('../multipassExecutable', () => ({
	...jest.requireActual('../multipassExecutable'),
	runMultipassCommand: jest.fn(),
}));

import { detectMultipassEnvironment } from '../multipassEnvironment';
import { runMultipassCommand } from '../multipassExecutable';

const run = jest.mocked(runMultipassCommand);

beforeEach(() => {
	run.mockReset();
	run.mockImplementation(async (args) => ({
		stdout: args[0] === 'version' ? '{"multipass":"1.17.0+mac","multipassd":"1.17.0"}' : 'qemu\n',
		stderr: '',
	}));
});

it('reads client and daemon independently with bounded read-only commands', async () => {
	expect(await detectMultipassEnvironment()).toEqual({
		clientVersion: '1.17.0+mac', daemonVersion: '1.17.0', driver: 'qemu', errors: [],
	});
	expect(run).toHaveBeenCalledWith(['version', '--format', 'json'], { timeout: 10000 });
	expect(run).toHaveBeenCalledWith(['get', 'local.driver'], { timeout: 10000 });
});

it.each(['qemu', 'applevz', 'hcs', 'hyperv', 'virtualbox', 'future-driver'])('preserves the configured driver %s instead of inferring it from the OS', async (driver) => {
	run.mockResolvedValueOnce({ stdout: '{"multipass":"1.17.0","multipassd":"1.16.0"}', stderr: '' });
	run.mockResolvedValueOnce({ stdout: `  ${driver}\r\n`, stderr: '' });
	expect(await detectMultipassEnvironment()).toMatchObject({ clientVersion: '1.17.0', daemonVersion: '1.16.0', driver });
});

it('retains the client version when a failed query still returns partial JSON', async () => {
	run.mockRejectedValueOnce(Object.assign(new Error('connection failed'), { stdout: '{"multipass":"1.17.0"}', stderr: 'daemon unavailable' }));
	const result = await detectMultipassEnvironment();
	expect(result).toMatchObject({ clientVersion: '1.17.0', daemonVersion: null, driver: 'qemu' });
	expect(result.errors).toContain('Version query: daemon unavailable');
});

it.each(['not json', '[]', 'null', '{"multipass":17,"multipassd":false}', '{}', ''])('handles malformed or missing version fields: %s', async (stdout) => {
	run.mockResolvedValueOnce({ stdout, stderr: '' });
	const result = await detectMultipassEnvironment();
	expect(result).toMatchObject({ clientVersion: null, daemonVersion: null, driver: 'qemu' });
	expect(result.errors.length).toBeGreaterThan(0);
});

it.each(['', 'qemu\nhcs', 'not a driver'])('does not invent a backend from invalid driver output %j', async (stdout) => {
	run.mockResolvedValueOnce({ stdout: '{"multipass":"1.17.0","multipassd":"1.17.0"}', stderr: '' });
	run.mockResolvedValueOnce({ stdout, stderr: '' });
	const result = await detectMultipassEnvironment();
	expect(result.driver).toBeNull();
	expect(result.clientVersion).toBe('1.17.0');
	expect(result.errors).toHaveLength(1);
});

it('reports unknown fields when both commands fail or time out', async () => {
	run.mockRejectedValue(new Error('timed out'));
	const result = await detectMultipassEnvironment();
	expect(result).toMatchObject({ clientVersion: null, daemonVersion: null, driver: null });
	expect(result.errors).toContain('Version query: timed out');
	expect(result.errors).toContain('Driver query: timed out');
});
