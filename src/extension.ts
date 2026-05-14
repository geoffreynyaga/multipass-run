import * as vscode from 'vscode';
import { MultipassViewProvider } from './MultipassViewProvider';
import { PendingLaunchStore } from './extension-utils/pendingLaunches';
import { registerCommands } from './extension-utils/registerCommands';

export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "multipass-run" is now active!');

	// Persist in-flight launches across reloads so the sidebar can render
	// "Downloading Image" / "Stuck" rows even when `multipass list` does not
	// know about them yet.
	const pendingStore = new PendingLaunchStore(context.globalState);
	const provider = new MultipassViewProvider(context.extensionUri, pendingStore, context.globalState);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider('multipass-run-view', provider)
	);
	context.subscriptions.push(provider.statusBarItem);

	context.subscriptions.push(
		vscode.window.onDidCloseTerminal(terminal => {
			provider.terminalManager.handleTerminalClosed(terminal);
		})
	);

	registerCommands(context, provider, pendingStore);
}

export function deactivate() {}
