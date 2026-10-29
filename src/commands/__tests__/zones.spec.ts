jest.mock('../../utils/multipassExecutable', () => ({
	...jest.requireActual('../../utils/multipassExecutable'),
	runMultipassCommand: jest.fn(), runMultipassAction: jest.fn(),
}));

import { runMultipassAction, runMultipassCommand } from '../../utils/multipassExecutable';
import { getZones, parseZones, setZoneAvailability } from '../zones';

const fixture = { zone2: { available: false, subnet: '10.42.1.0/24' }, zone1: { available: true, subnet: '10.42.0.0/24' } };

it('parses the tagged 1.17 root object and preserves availability and subnets', () => {
	expect(parseZones(JSON.stringify(fixture))).toEqual([
		{ name: 'zone1', available: true, subnet: '10.42.0.0/24' },
		{ name: 'zone2', available: false, subnet: '10.42.1.0/24' },
	]);
	expect(parseZones('{}')).toEqual([]);
});

it.each(['[]', 'null', 'invalid', '{"zones":[]}', '{"zone1":{"available":"false","subnet":"x"}}', '{"zone1":{"available":true}}', '{"--all":{"available":true,"subnet":"x"}}'])('rejects ambiguous or malformed zone data %s', (json) => {
	expect(() => parseZones(json)).toThrow();
});

it('uses the bounded read runner for zone discovery', async () => {
	jest.mocked(runMultipassCommand).mockResolvedValueOnce({ stdout: JSON.stringify(fixture), stderr: '' });
	expect((await getZones()).zones).toHaveLength(2);
	expect(runMultipassCommand).toHaveBeenCalledWith(['zones', '--format', 'json'], { timeout: 10000 });
});

it('preserves unsupported-command errors for the view', async () => {
	jest.mocked(runMultipassCommand).mockRejectedValueOnce({ stderr: 'Unknown command: zones' });
	expect(await getZones()).toEqual({ zones: [], error: 'Unknown command: zones' });
});

it.each([
	[false, ['disable-zones', '--force', 'zone2']],
	[true, ['enable-zones', 'zone2']],
] as const)('changes availability %s once, without a shell or retry', async (available, args) => {
	jest.mocked(runMultipassAction).mockResolvedValueOnce({ success: true });
	expect(await setZoneAvailability('zone2', available)).toEqual({ success: true });
	expect(runMultipassAction).toHaveBeenCalledTimes(1);
	expect(runMultipassAction).toHaveBeenCalledWith(args, expect.any(String));
});

it('does not pass flag-like zone names to a mutating command', async () => {
	expect((await setZoneAvailability('--all', false)).success).toBe(false);
	expect(runMultipassAction).not.toHaveBeenCalled();
});
