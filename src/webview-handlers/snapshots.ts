import * as vscode from 'vscode';

import { MultipassService } from '../multipassService';
import type { HandlerContext } from './context';

export async function handleGetSnapshots(msg: { instanceName: string }, ctx: HandlerContext): Promise<void> {
	const snapshots = await MultipassService.listSnapshots(msg.instanceName);
	ctx.postMessage({ command: 'snapshots', instanceName: msg.instanceName, snapshots });
}

export async function handleTakeSnapshot(
	msg: { instanceName: string; name?: string; comment?: string },
	ctx: HandlerContext
): Promise<void> {
	const result = await MultipassService.takeSnapshot(msg.instanceName, {
		name: msg.name,
		comment: msg.comment,
	});
	if (result.success) {
		vscode.window.showInformationMessage(
			`Snapshot '${result.snapshotName || 'created'}' for '${msg.instanceName}'`
		);
		const snapshots = await MultipassService.listSnapshots(msg.instanceName);
		ctx.postMessage({ command: 'snapshots', instanceName: msg.instanceName, snapshots });
	} else {
		vscode.window.showErrorMessage(`Failed to take snapshot: ${result.error}`);
	}
	ctx.postMessage({
		command: 'snapshotActionResult',
		instanceName: msg.instanceName,
		action: 'take',
		success: result.success,
		error: result.error,
	});
}

export async function handleRestoreSnapshot(
	msg: { instanceName: string; snapshotName: string },
	ctx: HandlerContext
): Promise<void> {
	const confirmed = await vscode.window.showWarningMessage(
		`Restore '${msg.instanceName}' to snapshot '${msg.snapshotName}'? This discards the instance's current state.`,
		{ modal: true },
		'Restore'
	);
	if (confirmed !== 'Restore') {
		ctx.postMessage({
			command: 'snapshotActionResult',
			instanceName: msg.instanceName,
			snapshotName: msg.snapshotName,
			action: 'restore',
			success: false,
			cancelled: true,
		});
		return;
	}
	const result = await MultipassService.restoreSnapshot(msg.instanceName, msg.snapshotName);
	if (result.success) {
		vscode.window.showInformationMessage(
			`Restored '${msg.instanceName}' to '${msg.snapshotName}'`
		);
		await ctx.refresh();
	} else {
		vscode.window.showErrorMessage(`Failed to restore snapshot: ${result.error}`);
	}
	ctx.postMessage({
		command: 'snapshotActionResult',
		instanceName: msg.instanceName,
		snapshotName: msg.snapshotName,
		action: 'restore',
		success: result.success,
		error: result.error,
	});
}

export async function handleDeleteSnapshot(
	msg: { instanceName: string; snapshotName: string },
	ctx: HandlerContext
): Promise<void> {
	const confirmed = await vscode.window.showWarningMessage(
		`Delete snapshot '${msg.snapshotName}' of '${msg.instanceName}'? This cannot be undone.`,
		{ modal: true },
		'Delete'
	);
	if (confirmed !== 'Delete') {
		ctx.postMessage({
			command: 'snapshotActionResult',
			instanceName: msg.instanceName,
			snapshotName: msg.snapshotName,
			action: 'delete',
			success: false,
			cancelled: true,
		});
		return;
	}
	const result = await MultipassService.deleteSnapshot(msg.instanceName, msg.snapshotName);
	if (result.success) {
		vscode.window.showInformationMessage(`Snapshot '${msg.snapshotName}' deleted`);
		const snapshots = await MultipassService.listSnapshots(msg.instanceName);
		ctx.postMessage({ command: 'snapshots', instanceName: msg.instanceName, snapshots });
	} else {
		vscode.window.showErrorMessage(`Failed to delete snapshot: ${result.error}`);
	}
	ctx.postMessage({
		command: 'snapshotActionResult',
		instanceName: msg.instanceName,
		snapshotName: msg.snapshotName,
		action: 'delete',
		success: result.success,
		error: result.error,
	});
}
