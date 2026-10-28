jest.mock('../../commands/zones', () => ({ getZones: jest.fn(), setZoneAvailability: jest.fn() }));
jest.mock('../../commands/listInstances', () => ({ getInstanceLists: jest.fn() }));

import * as vscode from 'vscode';

import { getInstanceLists } from '../../commands/listInstances';
import { getZones, setZoneAvailability } from '../../commands/zones';
import type { HandlerContext } from '../context';
import { handleGetZones, handleSetZoneAvailability } from '../zones';

function context(): HandlerContext {
	return { postMessage: jest.fn(), refresh: jest.fn(async () => undefined), terminalManager: { closeInstanceTerminals: jest.fn() } } as unknown as HandlerContext;
}

beforeEach(() => {
	jest.mocked(getZones).mockResolvedValue({ zones: [{ name: 'zone2', available: true, subnet: '10.42.1.0/24' }] });
	jest.mocked(getInstanceLists).mockResolvedValue({ active: [
		{ name: 'web', state: 'Running', ipv4: '', release: '', zone: { name: 'zone2', available: true } },
		{ name: 'db', state: 'Stopped', ipv4: '', release: '', zone: { name: 'zone2', available: true } },
		{ name: 'other-zone', state: 'Running', ipv4: '', release: '', zone: { name: 'zone1', available: true } },
	], deleted: [] });
	jest.mocked(setZoneAvailability).mockResolvedValue({ success: true });
	jest.mocked(vscode.window.showWarningMessage).mockResolvedValue(undefined);
});

it('fetches zone state and VM membership together', async () => {
	const ctx = context();
	await handleGetZones(undefined, ctx);
	expect(ctx.postMessage).toHaveBeenCalledWith(expect.objectContaining({ command: 'zones' }));
	expect(ctx.postMessage).toHaveBeenCalledWith(expect.objectContaining({ command: 'updateInstances' }));
});

it('cancels before any disable command and releases the busy state', async () => {
	const ctx = context();
	await handleSetZoneAvailability({ zoneName: 'zone2', available: false }, ctx);
	expect(setZoneAvailability).not.toHaveBeenCalled();
	expect(ctx.terminalManager.closeInstanceTerminals).not.toHaveBeenCalled();
	expect(ctx.postMessage).toHaveBeenCalledWith(expect.objectContaining({ command: 'zoneActionResult', success: false, cancelled: true }));
});

it('warns about forced power-off and the actual affected VMs before disabling', async () => {
	jest.mocked(vscode.window.showWarningMessage).mockResolvedValueOnce('Disable zone' as never);
	const ctx = context();
	await handleSetZoneAvailability({ zoneName: 'zone2', available: false }, ctx);
	expect(vscode.window.showWarningMessage).toHaveBeenCalledWith('Disable zone2?', expect.objectContaining({
		modal: true, detail: expect.stringContaining('forcefully powered off'),
	}), 'Disable zone');
	const options = jest.mocked(vscode.window.showWarningMessage).mock.calls[0][1];
	expect(options).toEqual(expect.objectContaining({ detail: expect.stringContaining('web (Running)') }));
	expect(options).toEqual(expect.objectContaining({ detail: expect.stringContaining('db (Stopped)') }));
	expect(options).toEqual(expect.objectContaining({ detail: expect.not.stringContaining('other-zone') }));
	expect(setZoneAvailability).toHaveBeenCalledWith('zone2', false);
	expect(ctx.terminalManager.closeInstanceTerminals).toHaveBeenCalledWith('web');
	expect(ctx.terminalManager.closeInstanceTerminals).not.toHaveBeenCalledWith('other-zone');
	expect(ctx.refresh).toHaveBeenCalled();
});

it('enables without a destructive confirmation and explains automatic restarts', async () => {
	jest.mocked(getZones).mockResolvedValue({ zones: [{ name: 'zone2', available: false, subnet: '' }] });
	await handleSetZoneAvailability({ zoneName: 'zone2', available: true }, context());
	expect(setZoneAvailability).toHaveBeenCalledWith('zone2', true);
	expect(vscode.window.showWarningMessage).not.toHaveBeenCalled();
	expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(expect.stringContaining('starting again'));
});

it('rejects stale or forged zone names without a confirmation or command', async () => {
	const ctx = context();
	await handleSetZoneAvailability({ zoneName: '--all', available: false }, ctx);
	expect(setZoneAvailability).not.toHaveBeenCalled();
	expect(vscode.window.showWarningMessage).not.toHaveBeenCalled();
	expect(ctx.postMessage).toHaveBeenCalledWith(expect.objectContaining({ command: 'zoneActionResult', success: false, error: expect.any(String) }));
});

it('refuses a disable if fresh VM membership cannot be read', async () => {
	jest.mocked(getInstanceLists).mockResolvedValue({ active: [], deleted: [], error: { type: 'other', message: 'list failed' } });
	await handleSetZoneAvailability({ zoneName: 'zone2', available: false }, context());
	expect(setZoneAvailability).not.toHaveBeenCalled();
	expect(vscode.window.showWarningMessage).not.toHaveBeenCalled();
});

it('refreshes and returns an action failure without claiming success', async () => {
	jest.mocked(vscode.window.showWarningMessage).mockResolvedValueOnce('Disable zone' as never);
	jest.mocked(setZoneAvailability).mockResolvedValueOnce({ success: false, error: 'backend failed' });
	const ctx = context();
	await handleSetZoneAvailability({ zoneName: 'zone2', available: false }, ctx);
	expect(ctx.refresh).toHaveBeenCalled();
	expect(ctx.postMessage).toHaveBeenCalledWith(expect.objectContaining({ command: 'zoneActionResult', success: false, error: 'backend failed' }));
});

it('serializes overlapping requests while a disable confirmation is open', async () => {
	let cancel = () => {};
	const confirmation = new Promise<undefined>(resolve => { cancel = () => resolve(undefined); });
	jest.mocked(vscode.window.showWarningMessage).mockReturnValueOnce(confirmation);
	const firstContext = context();
	const first = handleSetZoneAvailability({ zoneName: 'zone2', available: false }, firstContext);
	const secondContext = context();
	await handleSetZoneAvailability({ zoneName: 'zone2', available: false }, secondContext);
	expect(secondContext.postMessage).toHaveBeenCalledWith(expect.objectContaining({ command: 'zoneActionResult', success: false, error: expect.stringContaining('in progress') }));
	cancel();
	await first;
	expect(vscode.window.showWarningMessage).toHaveBeenCalledTimes(1);
	expect(setZoneAvailability).not.toHaveBeenCalled();
});

it('refreshes an externally changed zone without repeating its already completed action', async () => {
	const ctx = context();
	await handleSetZoneAvailability({ zoneName: 'zone2', available: true }, ctx);
	expect(setZoneAvailability).not.toHaveBeenCalled();
	expect(ctx.postMessage).toHaveBeenCalledWith(expect.objectContaining({ command: 'zoneActionResult', success: true }));
});
