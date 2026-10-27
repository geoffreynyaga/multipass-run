import * as vscode from 'vscode';

import { getInstanceLists } from '../commands/listInstances';
import { recoverInstance } from '../commands/recoverInstance';
import { startInstance } from '../commands/startInstance';
import { pollInstanceStatus } from '../extension-utils/instancePolling';
import { setupSSHConnection } from '../extension-utils/sshSetup';
import { findMultipassExecutable, shellEscape } from '../utils/multipassExecutable';
import type { HandlerContext } from './context';

async function buildShellCommand(instanceName: string): Promise<string> {
	const multipassPath = await findMultipassExecutable();
	return `${shellEscape(multipassPath)} shell ${shellEscape(instanceName)}`;
}

async function openShellTerminal(instanceName: string, ctx: HandlerContext): Promise<void> {
	const command = await buildShellCommand(instanceName);
	const terminal = vscode.window.createTerminal({
		name: `Multipass: ${instanceName}`,
		message: `Opening shell in instance '${instanceName}'...`,
	});
	terminal.show();
	ctx.terminalManager.addTerminal(instanceName, terminal);
	terminal.sendText(command);
}

export async function handleShellInstance(msg: { instanceName: string }, ctx: HandlerContext): Promise<void> {
	await openShellTerminal(msg.instanceName, ctx);
}

export async function handleSetupSSHInstance(msg: { instanceName: string }): Promise<void> {
	await setupSSHConnection(msg.instanceName);
}

export async function handleStartAndShellInstance(msg: { instanceName: string }, ctx: HandlerContext): Promise<void> {
	const currentLists = await getInstanceLists();
	const startingInstance = currentLists.active.find(i => i.name === msg.instanceName);
	if (startingInstance) {
		startingInstance.state = 'Starting';
		ctx.postMessage({ command: 'updateInstances', instanceLists: currentLists });
	}
	const result = await startInstance(msg.instanceName);
	if (result.success) {
		vscode.window.showInformationMessage(`Instance '${msg.instanceName}' is starting...`);
		setTimeout(() => {
			void openShellTerminal(msg.instanceName, ctx);
		}, 3000);
		pollInstanceStatus(msg.instanceName, () => ctx.refresh());
	} else {
		vscode.window.showErrorMessage(`Failed to start instance '${msg.instanceName}': ${result.error}`);
		await ctx.refresh();
	}
}

export async function handleRecoverAndShellInstance(msg: { instanceName: string }, ctx: HandlerContext): Promise<void> {
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
			const startResult = await startInstance(msg.instanceName);
			if (startResult.success) {
				setTimeout(() => {
					void openShellTerminal(msg.instanceName, ctx);
				}, 3000);
			}
		}, 2000);
		setTimeout(async () => {
			await ctx.refresh();
			vscode.window.showInformationMessage(`Instance '${msg.instanceName}' recovered and shell opened`);
		}, 6000);
	} else {
		vscode.window.showErrorMessage(`Failed to recover instance '${msg.instanceName}': ${result.error}`);
		await ctx.refresh();
	}
}
