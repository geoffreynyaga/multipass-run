import * as vscode from 'vscode';

import { deleteInstance } from '../commands/deleteInstance';
import { getInstanceInfo } from '../commands/getInstanceInfo';
import { getInstanceLists } from '../commands/listInstances';
import { recoverInstance } from '../commands/recoverInstance';
import { startInstance } from '../commands/startInstance';
import { stopInstance } from '../commands/stopInstance';
import { suspendInstance } from '../commands/suspendInstance';
import { pollInstanceStatus } from '../extension-utils/instancePolling';
import { removeSSHConfigForInstance } from '../utils/sshConfig';
import type { HandlerContext } from './context';

export async function handleGetInstanceInfo(msg: { instanceName: string }, ctx: HandlerContext): Promise<void> {
	const info = await getInstanceInfo(msg.instanceName);
	if (info) {
		ctx.postMessage({ command: 'instanceInfo', info });
	}
}

export async function handleStopInstance(msg: { instanceName: string }, ctx: HandlerContext): Promise<void> {
	const currentLists = await getInstanceLists();
	const stoppingInstance = currentLists.active.find(i => i.name === msg.instanceName);
	if (stoppingInstance) {
		stoppingInstance.state = 'Stopping';
		ctx.postMessage({ command: 'updateInstances', instanceLists: currentLists });
	}
	const result = await stopInstance(msg.instanceName);
	if (result.success) {
		vscode.window.showInformationMessage(`Instance '${msg.instanceName}' is stopping...`);
		ctx.terminalManager.closeInstanceTerminals(msg.instanceName);
		setTimeout(async () => {
			await ctx.refresh();
			vscode.window.showInformationMessage(`Instance '${msg.instanceName}' stopped`);
		}, 2000);
	} else {
		vscode.window.showErrorMessage(`Failed to stop instance '${msg.instanceName}': ${result.error}`);
		await ctx.refresh();
	}
}

export async function handleSuspendInstance(msg: { instanceName: string }, ctx: HandlerContext): Promise<void> {
	const result = await suspendInstance(msg.instanceName);
	if (result.success) {
		vscode.window.showInformationMessage(`Instance '${msg.instanceName}' is suspending...`);
		setTimeout(async () => {
			await ctx.refresh();
			vscode.window.showInformationMessage(`Instance '${msg.instanceName}' suspended`);
		}, 2000);
	} else {
		vscode.window.showErrorMessage(`Failed to suspend instance '${msg.instanceName}': ${result.error}`);
		await ctx.refresh();
	}
}

export async function handleStartInstance(msg: { instanceName: string }, ctx: HandlerContext): Promise<void> {
	const currentLists = await getInstanceLists();
	const startingInstance = currentLists.active.find(i => i.name === msg.instanceName);
	if (startingInstance) {
		startingInstance.state = 'Starting';
		ctx.postMessage({ command: 'updateInstances', instanceLists: currentLists });
	}
	const result = await startInstance(msg.instanceName);
	if (result.success) {
		vscode.window.showInformationMessage(`Instance '${msg.instanceName}' is starting...`);
		pollInstanceStatus(msg.instanceName, () => ctx.refresh());
	} else {
		vscode.window.showErrorMessage(`Failed to start instance '${msg.instanceName}': ${result.error}`);
		await ctx.refresh();
	}
}

export async function handleRecoverInstance(msg: { instanceName: string }, ctx: HandlerContext): Promise<void> {
	const currentLists = await getInstanceLists();
	const recoveringInstance = currentLists.deleted.find(i => i.name === msg.instanceName);
	if (recoveringInstance) {
		recoveringInstance.state = 'Recovering';
		ctx.postMessage({ command: 'updateInstances', instanceLists: currentLists });
	}
	const result = await recoverInstance(msg.instanceName);
	if (result.success) {
		vscode.window.showInformationMessage(`Instance '${msg.instanceName}' is recovering...`);
		setTimeout(async () => {
			await ctx.refresh();
			vscode.window.showInformationMessage(`Instance '${msg.instanceName}' recovered`);
		}, 2000);
	} else {
		vscode.window.showErrorMessage(`Failed to recover instance '${msg.instanceName}': ${result.error}`);
		await ctx.refresh();
	}
}

export async function handleDeleteInstance(msg: { instanceName: string }, ctx: HandlerContext): Promise<void> {
	const choice = await vscode.window.showWarningMessage(
		`What would you like to do with instance '${msg.instanceName}'?\n\nDelete: Move to trash (can be recovered)\nPurge: Permanently delete (cannot be recovered)`,
		{ modal: true },
		'Delete',
		'Purge'
	);

	if (choice === 'Delete') {
		const currentLists = await getInstanceLists();
		const deletingInstance = currentLists.active.find(i => i.name === msg.instanceName);
		if (deletingInstance) {
			deletingInstance.state = 'Deleting';
			ctx.postMessage({ command: 'updateInstances', instanceLists: currentLists });
		}
		const result = await deleteInstance(msg.instanceName, false);
		if (result.success) {
			vscode.window.showInformationMessage(`Instance '${msg.instanceName}' deleted (can be recovered)`);
			ctx.terminalManager.closeInstanceTerminals(msg.instanceName);
			await ctx.refresh();
		} else {
			vscode.window.showErrorMessage(`Failed to delete instance '${msg.instanceName}': ${result.error}`);
			await ctx.refresh();
		}
	} else if (choice === 'Purge') {
		const currentLists = await getInstanceLists();
		const deletingInstance = currentLists.active.find(i => i.name === msg.instanceName);
		if (deletingInstance) {
			deletingInstance.state = 'Deleting';
			ctx.postMessage({ command: 'updateInstances', instanceLists: currentLists });
		}
		const result = await deleteInstance(msg.instanceName, true);
		if (result.success) {
			vscode.window.showInformationMessage(`Instance '${msg.instanceName}' permanently deleted`);
			ctx.terminalManager.closeInstanceTerminals(msg.instanceName);
			await removeSSHConfigForInstance(msg.instanceName);
			await ctx.refresh();
			await ctx.maybeOfferKeyRemovalPrompt();
		} else {
			vscode.window.showErrorMessage(`Failed to purge instance '${msg.instanceName}': ${result.error}`);
			await ctx.refresh();
		}
	}
}

export async function handlePurgeInstance(msg: { instanceName: string }, ctx: HandlerContext): Promise<void> {
	const confirm = await vscode.window.showWarningMessage(
		`Are you sure you want to permanently purge instance '${msg.instanceName}'? This cannot be undone.`,
		{ modal: true },
		'Purge'
	);
	if (confirm !== 'Purge') {
		return;
	}
	const currentLists = await getInstanceLists();
	const deletingInstance = currentLists.deleted.find(i => i.name === msg.instanceName);
	if (deletingInstance) {
		deletingInstance.state = 'Deleting';
		ctx.postMessage({ command: 'updateInstances', instanceLists: currentLists });
	}
	const result = await deleteInstance(msg.instanceName, true);
	if (result.success) {
		vscode.window.showInformationMessage(`Instance '${msg.instanceName}' purged`);
		ctx.terminalManager.closeInstanceTerminals(msg.instanceName);
		await removeSSHConfigForInstance(msg.instanceName);
		await ctx.refresh();
		await ctx.maybeOfferKeyRemovalPrompt();
	} else {
		vscode.window.showErrorMessage(`Failed to purge instance '${msg.instanceName}': ${result.error}`);
		await ctx.refresh();
	}
}
