jest.mock('../../commands/listSnapshots', () => ({ listSnapshots: jest.fn(async () => []) }));
jest.mock('../../commands/takeSnapshot', () => ({ takeSnapshot: jest.fn(async () => ({ success: true })) }));
jest.mock('../../commands/restoreSnapshot', () => ({ restoreSnapshot: jest.fn(async () => ({ success: true })) }));
jest.mock('../../commands/deleteSnapshot', () => ({ deleteSnapshot: jest.fn(async () => ({ success: true })) }));
jest.mock('../../commands/suspendInstance', () => ({ suspendInstance: jest.fn(async () => ({ success: true })) }));

import * as vscode from 'vscode';

import { deleteSnapshot } from '../../commands/deleteSnapshot';
import { listSnapshots } from '../../commands/listSnapshots';
import { restoreSnapshot } from '../../commands/restoreSnapshot';
import { suspendInstance } from '../../commands/suspendInstance';
import { takeSnapshot } from '../../commands/takeSnapshot';
import type { HandlerContext } from '../context';
import { handleSuspendInstance } from '../instance';
import { handleDeleteSnapshot, handleGetSnapshots, handleRestoreSnapshot, handleTakeSnapshot } from '../snapshots';

function context(driver: string | null = 'applevz'): HandlerContext {
	return {
		// Cached state says QEMU; the fresh inspection is authoritative.
		multipassCapabilities: { environment: { driver: 'qemu', daemonVersion: '1.17.0' } },
		inspectEnvironment: jest.fn(async () => ({ clientVersion: '1.17.0', daemonVersion: '1.17.0', driver, errors: [] })),
		postMessage: jest.fn(), refresh: jest.fn(async () => undefined),
	} as unknown as HandlerContext;
}

beforeEach(() => { jest.useFakeTimers(); });
afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); });

it('does not list snapshots on AppleVZ and clears stale snapshot data', async () => {
	const ctx = context();
	await handleGetSnapshots({ instanceName: 'vm' }, ctx);
	expect(listSnapshots).not.toHaveBeenCalled();
	expect(ctx.postMessage).toHaveBeenCalledWith({ command: 'snapshots', instanceName: 'vm', snapshots: [] });
});

it.each(['take', 'restore', 'delete', 'suspend'] as const)('blocks %s before CLI mutation even when cached state says QEMU', async (action) => {
	const ctx = context();
	const msg = { instanceName: 'vm', snapshotName: 'clean' };
	if (action === 'take') { await handleTakeSnapshot(msg, ctx); }
	if (action === 'restore') { await handleRestoreSnapshot(msg, ctx); }
	if (action === 'delete') { await handleDeleteSnapshot(msg, ctx); }
	if (action === 'suspend') { await handleSuspendInstance(msg, ctx); }
	expect(ctx.inspectEnvironment).toHaveBeenCalled();
	expect(takeSnapshot).not.toHaveBeenCalled();
	expect(restoreSnapshot).not.toHaveBeenCalled();
	expect(deleteSnapshot).not.toHaveBeenCalled();
	expect(suspendInstance).not.toHaveBeenCalled();
	expect(vscode.window.showWarningMessage).not.toHaveBeenCalled();
	expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(expect.stringContaining('AppleVZ'));
	expect(ctx.postMessage).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
});

it.each(['qemu', 'hcs'])('continues to list/take snapshots and suspend on %s', async driver => {
	const ctx = context(driver);
	await handleGetSnapshots({ instanceName: 'vm' }, ctx);
	await handleTakeSnapshot({ instanceName: 'vm', name: 'clean' }, ctx);
	await handleSuspendInstance({ instanceName: 'vm' }, ctx);
	expect(listSnapshots).toHaveBeenCalledWith('vm');
	expect(takeSnapshot).toHaveBeenCalledWith('vm', { name: 'clean', comment: undefined });
	expect(suspendInstance).toHaveBeenCalledWith('vm');
});

it('blocks actions when inspection fails and clears pending suspend UI state', async () => {
	const ctx = context();
	jest.mocked(ctx.inspectEnvironment).mockRejectedValueOnce(new Error('socket failed'));
	await handleSuspendInstance({ instanceName: 'vm' }, ctx);
	expect(suspendInstance).not.toHaveBeenCalled();
	expect(ctx.postMessage).toHaveBeenCalledWith({ command: 'suspendActionResult', instanceName: 'vm', success: false });
	expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(expect.stringContaining('Unable to check backend support'));
});

it('blocks actions for an unrecognized driver', async () => {
	await handleTakeSnapshot({ instanceName: 'vm' }, context('future-driver'));
	expect(takeSnapshot).not.toHaveBeenCalled();
});
