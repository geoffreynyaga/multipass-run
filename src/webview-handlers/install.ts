import * as vscode from 'vscode';
import { MULTIPASS_DOWNLOAD_URL } from '../utils/installPackageManager';
import type { HandlerContext } from './context';

export async function handleDownloadMultipass(): Promise<void> {
	vscode.env.openExternal(vscode.Uri.parse(MULTIPASS_DOWNLOAD_URL));
}

export async function handleInstallViaTerminal(_msg: unknown, ctx: HandlerContext): Promise<void> {
	if (!ctx.installPlan?.command) {
		vscode.window.showErrorMessage('No package manager detected for terminal install. Use Open Download Page instead.');
		return;
	}
	const terminal = vscode.window.createTerminal({ name: 'Install Multipass' });
	terminal.show();
	terminal.sendText(ctx.installPlan.command, false);
}

export async function handleCopyInstallCommand(_msg: unknown, ctx: HandlerContext): Promise<void> {
	if (!ctx.installPlan?.command) {
		vscode.window.showErrorMessage('No package manager detected. Nothing to copy.');
		return;
	}
	await vscode.env.clipboard.writeText(ctx.installPlan.command);
	vscode.window.showInformationMessage('Install command copied to clipboard.');
}

export async function handleOpenInstallManagerHelp(_msg: unknown, ctx: HandlerContext): Promise<void> {
	if (!ctx.installPlan?.managerHelpUrl) {
		vscode.window.showErrorMessage('No package manager help page is available for this system.');
		return;
	}
	vscode.env.openExternal(vscode.Uri.parse(ctx.installPlan.managerHelpUrl));
}

export async function handleOpenMultipassDocumentation(): Promise<void> {
	vscode.env.openExternal(vscode.Uri.parse(MULTIPASS_DOWNLOAD_URL));
}
