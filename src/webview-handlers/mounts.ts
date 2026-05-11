import * as vscode from 'vscode';
import * as nodePath from 'path';
import { MultipassService } from '../multipassService';
import { mountFolder, unmountFolder } from '../commands/mountFolder';
import type { HandlerContext } from './context';

export async function handleAddMount(msg: { instanceName: string }, ctx: HandlerContext): Promise<void> {
	const folder = await vscode.window.showOpenDialog({
		canSelectFiles: false,
		canSelectFolders: true,
		canSelectMany: false,
		openLabel: 'Mount in instance',
		title: `Mount folder into '${msg.instanceName}'`,
	});
	if (!folder || folder.length === 0) {
		return;
	}
	const hostPath = folder[0].fsPath;
	const baseName = nodePath.basename(hostPath) || 'shared';
	const defaultGuestPath = `/home/ubuntu/${baseName}`;
	const guestPath = await vscode.window.showInputBox({
		title: `Mount target inside '${msg.instanceName}'`,
		prompt: 'Path inside the instance to mount the folder at',
		value: defaultGuestPath,
		validateInput: (v) => {
			if (!v) { return 'Path is required'; }
			if (!v.startsWith('/')) { return 'Path must be absolute (start with /)'; }
			return null;
		},
	});
	if (!guestPath) {
		return;
	}
	const result = await mountFolder(msg.instanceName, hostPath, guestPath);
	if (result.success) {
		vscode.window.showInformationMessage(
			`Mounted '${hostPath}' into '${msg.instanceName}' at ${guestPath}`
		);
		const info = await MultipassService.getInstanceInfo(msg.instanceName);
		if (info) {
			ctx.postMessage({ command: 'instanceInfo', info });
		}
		await ctx.refresh();
	} else {
		vscode.window.showErrorMessage(`Failed to mount: ${result.error}`);
	}
}

export async function handleRemoveMount(msg: { instanceName: string; guestPath: string }, ctx: HandlerContext): Promise<void> {
	const confirmed = await vscode.window.showWarningMessage(
		`Unmount '${msg.guestPath}' from '${msg.instanceName}'?`,
		{ modal: true },
		'Unmount'
	);
	if (confirmed !== 'Unmount') {
		return;
	}
	const result = await unmountFolder(msg.instanceName, msg.guestPath);
	if (result.success) {
		vscode.window.showInformationMessage(
			`Unmounted ${msg.guestPath} from '${msg.instanceName}'`
		);
		const info = await MultipassService.getInstanceInfo(msg.instanceName);
		if (info) {
			ctx.postMessage({ command: 'instanceInfo', info });
		}
		await ctx.refresh();
	} else {
		vscode.window.showErrorMessage(`Failed to unmount: ${result.error}`);
	}
}
