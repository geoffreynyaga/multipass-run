import * as vscode from 'vscode';

import { pollInstanceStatus } from '../extension-utils/instancePolling';
import { setupSSHConnection } from '../extension-utils/sshSetup';
import { MultipassService } from '../multipassService';
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
	const result = await MultipassService.startInstance(msg.instanceName);
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
	const result = await MultipassService.recoverInstance(msg.instanceName);
	if (result.success) {
		vscode.window.showInformationMessage(`Instance '${msg.instanceName}' is recovering...`);
		setTimeout(async () => {
			const startResult = await MultipassService.startInstance(msg.instanceName);
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
