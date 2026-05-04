// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import { MultipassService } from './multipassService';
import { MULTIPASS_PATHS } from './utils/constants';
import { WebviewContent } from './webviewContent';
import { createDefaultInstance } from './commands/launch/createDefaultInstance';
import { createDetailedInstance } from './commands/launch/createDetailedInstance';
import { launchInstance } from './commands/launch/launchInstance';

// Extension utilities
import { handleCreateDefaultInstance, handleCreateDetailedInstance } from './extension-utils/instanceCreation';
import { pollInstanceStatus } from './extension-utils/instancePolling';
import {
	PendingLaunchStore,
	mergePendingIntoLists,
	reconcilePending,
} from './extension-utils/pendingLaunches';
import { setupSSHConnection } from './extension-utils/sshSetup';
import { TerminalManager } from './extension-utils/terminalManager';

// WebView provider for the sidebar view
class MultipassViewProvider implements vscode.WebviewViewProvider {
	private _view?: vscode.WebviewView;
	private _htmlInitialized = false;
	public terminalManager = new TerminalManager();

	constructor(
		private readonly _extensionUri: vscode.Uri,
		public readonly pendingStore: PendingLaunchStore,
		private readonly _globalState: vscode.Memento
	) {}

	private async maybeOfferKeyRemovalPrompt(): Promise<void> {
		try {
			if (MultipassService.countManagedSSHEntries() > 0) {
				return;
			}
			if (this._globalState.get<boolean>('multipassRun.skipKeyRemovalPrompt', false)) {
				return;
			}
			const choice = await vscode.window.showInformationMessage(
				'No more multipass instances. Remove the multipass SSH key pair from ~/.ssh?',
				'Yes',
				'No',
				"Don't ask again"
			);
			if (choice === 'Yes') {
				MultipassService.removeManagedSSHKeyPair();
				vscode.window.showInformationMessage('Multipass SSH key pair removed.');
			} else if (choice === "Don't ask again") {
				await this._globalState.update('multipassRun.skipKeyRemovalPrompt', true);
			}
		} catch (err) {
			console.error('maybeOfferKeyRemovalPrompt failed:', err);
		}
	}

	public async resolveWebviewView(webviewView: vscode.WebviewView): Promise<void> {
		this._view = webviewView;

		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [
				vscode.Uri.joinPath(this._extensionUri, 'media'),
				vscode.Uri.joinPath(this._extensionUri, 'dist')
			]
		};

		// Handle messages from the webview
		webviewView.webview.onDidReceiveMessage(async (message) => {
			if (message.command === 'refreshList') {
				// Simple refresh of the instance list
				await this.refresh();
			} else if (message.command === 'downloadMultipass') {
				// Open Multipass download page
				const choice = await vscode.window.showInformationMessage(
					'Multipass is not installed. Would you like to download it?',
					'Open Download Page',
					'Cancel'
				);

				if (choice === 'Open Download Page') {
					vscode.env.openExternal(vscode.Uri.parse('https://documentation.ubuntu.com/multipass/latest/how-to-guides/install-multipass/'));
				}
			} else if (message.command === 'cancelPendingLaunch') {
				await this.pendingStore.remove(message.instanceName);
				await this.refresh();
			} else if (message.command === 'retryPendingLaunch') {
				// Drop the stuck entry, then re-enter the default launch flow.
				await this.pendingStore.remove(message.instanceName);
				await this.refresh();
				await this.createDefaultInstance();
			} else if (message.command === 'getInstanceInfo') {
				const info = await MultipassService.getInstanceInfo(message.instanceName);
				if (info && this._view) {
					this._view.webview.postMessage({
						command: 'instanceInfo',
						info: info
					});
				}
			} else if (message.command === 'stopInstance') {
				// Show stopping state immediately by updating the instance in the list
				const currentLists = await MultipassService.getInstanceLists();
				const stoppingInstance = currentLists.active.find(i => i.name === message.instanceName);
				if (stoppingInstance && this._view) {
					stoppingInstance.state = 'Stopping';
					this._view.webview.postMessage({
						command: 'updateInstances',
						instanceLists: currentLists
					});
				}

			const result = await MultipassService.stopInstance(message.instanceName);
			if (result.success) {
				vscode.window.showInformationMessage(`Instance '${message.instanceName}' is stopping...`);
				// Close associated terminals
				this.terminalManager.closeInstanceTerminals(message.instanceName);
				// Refresh after a short delay to show stopped state
					setTimeout(async () => {
						await this.refresh();
						vscode.window.showInformationMessage(`Instance '${message.instanceName}' stopped`);
					}, 2000);
				} else {
					vscode.window.showErrorMessage(`Failed to stop instance '${message.instanceName}': ${result.error}`);
					await this.refresh();
				}
			} else if (message.command === 'suspendInstance') {
				const result = await MultipassService.suspendInstance(message.instanceName);
				if (result.success) {
					vscode.window.showInformationMessage(`Instance '${message.instanceName}' is suspending...`);
					// Refresh after a short delay to show suspended state
					setTimeout(async () => {
						await this.refresh();
						vscode.window.showInformationMessage(`Instance '${message.instanceName}' suspended`);
					}, 2000);
				} else {
					vscode.window.showErrorMessage(`Failed to suspend instance '${message.instanceName}': ${result.error}`);
					await this.refresh();
				}
			} else if (message.command === 'startInstance') {
				// Show starting state immediately by updating the instance in the list
				const currentLists = await MultipassService.getInstanceLists();
				const startingInstance = currentLists.active.find(i => i.name === message.instanceName);
				if (startingInstance && this._view) {
					startingInstance.state = 'Starting';
					this._view.webview.postMessage({
						command: 'updateInstances',
						instanceLists: currentLists
					});
				}

			const result = await MultipassService.startInstance(message.instanceName);
			if (result.success) {
				vscode.window.showInformationMessage(`Instance '${message.instanceName}' is starting...`);
				// Start polling for status updates
				pollInstanceStatus(message.instanceName, () => this.refresh());
			} else {
					vscode.window.showErrorMessage(`Failed to start instance '${message.instanceName}': ${result.error}`);
					// Refresh to clear the starting state
					await this.refresh();
				}
			} else if (message.command === 'shellInstance') {
				// Open a shell in the instance using VS Code's integrated terminal
				const terminal = vscode.window.createTerminal({
					name: `Multipass: ${message.instanceName}`,
					message: `Opening shell in instance '${message.instanceName}'...`
				});
				terminal.show();

				// Track this terminal for the instance
				this.terminalManager.addTerminal(message.instanceName, terminal);

				// Try multipass paths in order
				// Build a command that tries each path until one succeeds
				const shellCommands: string[] = [];
				for (const path of MULTIPASS_PATHS) {
					shellCommands.push(`${path} shell ${message.instanceName}`);
				}
				const shellCommand = shellCommands.join(' || ');
				terminal.sendText(shellCommand);
			} else if (message.command === 'setupSSHInstance') {
				await setupSSHConnection(message.instanceName);
			} else if (message.command === 'startAndShellInstance') {
				// Start the instance first
				const result = await MultipassService.startInstance(message.instanceName);
				if (result.success) {
					vscode.window.showInformationMessage(`Instance '${message.instanceName}' is starting...`);

					// Wait a bit for the instance to start, then open shell
					setTimeout(() => {
						const terminal = vscode.window.createTerminal({
							name: `Multipass: ${message.instanceName}`,
							message: `Opening shell in instance '${message.instanceName}'...`
						});
					terminal.show();

					// Track this terminal for the instance
					this.terminalManager.addTerminal(message.instanceName, terminal);

					// Try multipass paths in order
						// Build a command that tries each path until one succeeds
						const shellCommands: string[] = [];
						for (const path of MULTIPASS_PATHS) {
							shellCommands.push(`${path} shell ${message.instanceName}`);
						}
						const shellCommand = shellCommands.join(' || ');
					terminal.sendText(shellCommand);
				}, 3000); // Wait 3 seconds for instance to start

				// Start polling for status updates
				pollInstanceStatus(message.instanceName, () => this.refresh());
			} else {
					vscode.window.showErrorMessage(`Failed to start instance '${message.instanceName}': ${result.error}`);
					await this.refresh();
				}
			} else if (message.command === 'recoverAndShellInstance') {
				// Recover the instance first
				const result = await MultipassService.recoverInstance(message.instanceName);
				if (result.success) {
					vscode.window.showInformationMessage(`Instance '${message.instanceName}' is recovering...`);

					// Wait for recovery and start, then open shell
					setTimeout(async () => {
						// Start the instance
						const startResult = await MultipassService.startInstance(message.instanceName);
						if (startResult.success) {
							// Wait a bit more for instance to be running
							setTimeout(() => {
								const terminal = vscode.window.createTerminal({
									name: `Multipass: ${message.instanceName}`,
									message: `Opening shell in instance '${message.instanceName}'...`
								});
							terminal.show();

							// Track this terminal for the instance
							this.terminalManager.addTerminal(message.instanceName, terminal);

							// Try multipass paths in order
								// Build a command that tries each path until one succeeds
								const shellCommands: string[] = [];
								for (const path of MULTIPASS_PATHS) {
									shellCommands.push(`${path} shell ${message.instanceName}`);
								}
								const shellCommand = shellCommands.join(' || ');
								terminal.sendText(shellCommand);
							}, 3000); // Wait 3 seconds for instance to start
						}
					}, 2000); // Wait 2 seconds for recovery

					// Refresh after a short delay
					setTimeout(async () => {
						await this.refresh();
						vscode.window.showInformationMessage(`Instance '${message.instanceName}' recovered and shell opened`);
					}, 6000); // Total wait time
				} else {
					vscode.window.showErrorMessage(`Failed to recover instance '${message.instanceName}': ${result.error}`);
					await this.refresh();
				}
			} else if (message.command === 'launchInstance') {
				await this.createDefaultInstance();
			} else if (message.command === 'deleteInstance') {
				console.log('Extension received deleteInstance command for:', message.instanceName);

				// Show confirmation dialog with Delete and Purge options
				const choice = await vscode.window.showWarningMessage(
					`What would you like to do with instance '${message.instanceName}'?\n\nDelete: Move to trash (can be recovered)\nPurge: Permanently delete (cannot be recovered)`,
					{ modal: true },
					'Delete',
					'Purge'
				);

				if (choice === 'Delete') {
					console.log('Delete confirmed');
					// Show deleting state immediately by updating the instance in the list
					const currentLists = await MultipassService.getInstanceLists();
					const deletingInstance = currentLists.active.find(i => i.name === message.instanceName);
					if (deletingInstance && this._view) {
						deletingInstance.state = 'Deleting';
						this._view.webview.postMessage({
							command: 'updateInstances',
							instanceLists: currentLists
						});
					}

					const result = await MultipassService.deleteInstance(message.instanceName, false);
					console.log('Delete result:', result);

					if (result.success) {
				vscode.window.showInformationMessage(`Instance '${message.instanceName}' deleted (can be recovered)`);
				// Close associated terminals
				this.terminalManager.closeInstanceTerminals(message.instanceName);
				await this.refresh();
					} else {
						vscode.window.showErrorMessage(`Failed to delete instance '${message.instanceName}': ${result.error}`);
						await this.refresh();
					}
				} else if (choice === 'Purge') {
					console.log('Purge confirmed');
					// Show deleting state immediately by updating the instance in the list
					const currentLists = await MultipassService.getInstanceLists();
					const deletingInstance = currentLists.active.find(i => i.name === message.instanceName);
					if (deletingInstance && this._view) {
						deletingInstance.state = 'Deleting';
						this._view.webview.postMessage({
							command: 'updateInstances',
							instanceLists: currentLists
						});
					}

					const result = await MultipassService.deleteInstance(message.instanceName, true);
					console.log('Purge result:', result);

					if (result.success) {
				vscode.window.showInformationMessage(`Instance '${message.instanceName}' permanently deleted`);
				// Close associated terminals
				this.terminalManager.closeInstanceTerminals(message.instanceName);
				// Remove SSH config if it exists
						await MultipassService.removeSSHConfigForInstance(message.instanceName);
						await this.refresh();
						await this.maybeOfferKeyRemovalPrompt();
					} else {
						vscode.window.showErrorMessage(`Failed to purge instance '${message.instanceName}': ${result.error}`);
						await this.refresh();
					}
				} else {
					console.log('Delete cancelled by user');
				}
			} else if (message.command === 'recoverInstance') {
				// Show recovering state immediately by updating the instance in the list
				const currentLists = await MultipassService.getInstanceLists();
				const recoveringInstance = currentLists.deleted.find(i => i.name === message.instanceName);
				if (recoveringInstance && this._view) {
					recoveringInstance.state = 'Recovering';
					this._view.webview.postMessage({
						command: 'updateInstances',
						instanceLists: currentLists
					});
				}

				const result = await MultipassService.recoverInstance(message.instanceName);
				if (result.success) {
					vscode.window.showInformationMessage(`Instance '${message.instanceName}' is recovering...`);
					// Refresh after a short delay to show recovered state
					setTimeout(async () => {
						await this.refresh();
						vscode.window.showInformationMessage(`Instance '${message.instanceName}' recovered`);
					}, 2000);
				} else {
					vscode.window.showErrorMessage(`Failed to recover instance '${message.instanceName}': ${result.error}`);
					await this.refresh();
				}
			} else if (message.command === 'purgeInstance') {
				const confirm = await vscode.window.showWarningMessage(
					`Are you sure you want to permanently purge instance '${message.instanceName}'? This cannot be undone.`,
					{ modal: true },
					'Purge'
				);

				if (confirm === 'Purge') {
					// Show deleting state immediately by updating the instance in the list
					const currentLists = await MultipassService.getInstanceLists();
					const deletingInstance = currentLists.deleted.find(i => i.name === message.instanceName);
					if (deletingInstance && this._view) {
						deletingInstance.state = 'Deleting';
						this._view.webview.postMessage({
							command: 'updateInstances',
							instanceLists: currentLists
						});
					}

					const result = await MultipassService.deleteInstance(message.instanceName, true);
					if (result.success) {
				vscode.window.showInformationMessage(`Instance '${message.instanceName}' purged`);
				// Close associated terminals
				this.terminalManager.closeInstanceTerminals(message.instanceName);
				// Remove SSH config if it exists
						await MultipassService.removeSSHConfigForInstance(message.instanceName);
						await this.refresh();
						await this.maybeOfferKeyRemovalPrompt();
					} else {
						vscode.window.showErrorMessage(`Failed to purge instance '${message.instanceName}': ${result.error}`);
						await this.refresh();
					}
				}
			}
		});

		await this.refresh();
	}

	public async createDefaultInstance(): Promise<void> {
		await handleCreateDefaultInstance(
			this._view,
			this.pendingStore,
			(instanceName: string) => {
				pollInstanceStatus(instanceName, () => this.refresh());
			}
		);
	}

	public async createDetailedInstance(): Promise<void> {
		await handleCreateDetailedInstance(
			this._view,
			this.pendingStore,
			(instanceName: string) => {
				pollInstanceStatus(instanceName, () => this.refresh());
			}
		);
	}

	public async refresh(): Promise<void> {
		if (!this._view) {
			return;
		}

		const rawLists = await MultipassService.getInstanceLists();

		// Reconcile pending launches against the real list. Drop ones that have
		// landed; flag ones that have been hanging past STUCK_THRESHOLD_MS.
		if (!rawLists.error) {
			await reconcilePending(this.pendingStore, rawLists);
		}
		const merged = rawLists.error
			? rawLists
			: mergePendingIntoLists(rawLists, this.pendingStore.list());

		// If webview HTML is not set yet, set it with initial data
		if (!this._htmlInitialized) {
			this._view.webview.html = WebviewContent.getHtml(merged, this._view.webview, this._extensionUri);
			this._htmlInitialized = true;
		} else {
			// Otherwise, just update the React state via message
			this._view.webview.postMessage({
				command: 'updateInstances',
				instanceLists: merged
			});
		}
	}
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "multipass-run" is now active!');

	// Persist in-flight launches across reloads so the sidebar can render
	// "Downloading Image" / "Stuck" rows even when `multipass list` does not
	// know about them yet.
	const pendingStore = new PendingLaunchStore(context.globalState);

	// Register the webview view provider
	const provider = new MultipassViewProvider(context.extensionUri, pendingStore, context.globalState);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider('multipass-run-view', provider)
	);

	// Listen for terminal close events to clean up our tracking
	context.subscriptions.push(
		vscode.window.onDidCloseTerminal(terminal => {
			provider.terminalManager.handleTerminalClosed(terminal);
		})
	);

	// Register refresh command
	context.subscriptions.push(
		vscode.commands.registerCommand('multipass-run.refresh', () => {
			provider.refresh();
		})
	);

	// Register create instance menu command
	context.subscriptions.push(
		vscode.commands.registerCommand('multipass-run.createInstanceMenu', async () => {
			const options = [
				{
					label: '$(add) Default',
					description: 'Ubuntu LTS, 1 CPU / 1G / 5G',
					id: 'create-default'
				},
				{
					label: '$(settings-gear) Custom',
					description: 'Pick CPU, RAM, disk',
					id: 'create-detailed'
				},
				{
					label: '$(file-code) Cloud-init',
					description: 'Launch from cloud-init YAML',
					id: 'create-cloud-init'
				},
				{
					label: '$(file) Profile',
					description: 'Use a saved configuration',
					id: 'create-profile'
				}
			];

			const selected = await vscode.window.showQuickPick(options, {
				placeHolder: 'Pick a launch method',
				title: 'Launch Multipass Instance'
			});

			if (selected) {
				switch (selected.id) {
					case 'create-default':
						await provider.createDefaultInstance();
						break;
					case 'create-profile':
						vscode.window.showInformationMessage('Profile launches are coming soon.');
						break;
					case 'create-detailed':
						await provider.createDetailedInstance();
						break;
					case 'create-cloud-init':
						vscode.window.showInformationMessage('Cloud-init launches are coming soon.');
						break;
				}
			}
		})
	);

	// Register setup SSH command
	context.subscriptions.push(
		vscode.commands.registerCommand('multipass-run.setupSSH', async () => {
			await MultipassService.setupSSH();
		})
	);

	// Register command to prune SSH config blocks for VMs that no longer exist
	// in `multipass list` (e.g. created before this extension's bracket-marker
	// format, or deleted via the multipass CLI directly).
	context.subscriptions.push(
		vscode.commands.registerCommand('multipass-run.pruneOrphanedSSHEntries', async () => {
			try {
				const lists = await MultipassService.getInstanceLists();
				if (lists.error) {
					vscode.window.showErrorMessage(
						`Cannot prune: ${lists.error.message}`
					);
					return;
				}
				const known = new Set<string>([
					...lists.active.map((i) => i.name),
					...lists.deleted.map((i) => i.name),
				]);
				const removed = await MultipassService.pruneOrphanedSSHEntries(known);
				if (removed.length === 0) {
					vscode.window.showInformationMessage('No orphaned SSH config entries found.');
				} else {
					vscode.window.showInformationMessage(
						`Removed ${removed.length} orphaned SSH entr${removed.length === 1 ? 'y' : 'ies'}: ${removed.join(', ')}`
					);
				}
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err);
				vscode.window.showErrorMessage(`Prune failed: ${message}`);
			}
		})
	);

	// One-time auto-scrub at activation: pick up entries left over by previous
	// versions of this extension or by direct CLI deletes. Runs after a short
	// delay so the multipass daemon has time to respond.
	setTimeout(async () => {
		try {
			const lists = await MultipassService.getInstanceLists();
			if (lists.error) {
				return;
			}
			const known = new Set<string>([
				...lists.active.map((i) => i.name),
				...lists.deleted.map((i) => i.name),
			]);
			const removed = await MultipassService.pruneOrphanedSSHEntries(known);
			if (removed.length > 0) {
				console.log(
					`[multipass-run] Auto-pruned ${removed.length} orphaned SSH entr${removed.length === 1 ? 'y' : 'ies'}: ${removed.join(', ')}`
				);
			}
		} catch (err) {
			console.warn('[multipass-run] Auto-prune of orphaned SSH entries failed:', err);
		}
	}, 3000);

	// Register command to clear pending launches that got "stuck" (e.g., after
	// uninstall/reinstall of multipass leaves orphaned synthetic rows).
	context.subscriptions.push(
		vscode.commands.registerCommand('multipass-run.clearPendingLaunches', async () => {
			const pending = pendingStore.list();
			if (pending.length === 0) {
				vscode.window.showInformationMessage('No pending launches to clear.');
				return;
			}
			const confirm = await vscode.window.showWarningMessage(
				`Clear ${pending.length} pending launch entr${pending.length === 1 ? 'y' : 'ies'}? ` +
					`This only removes the local sidebar row, not any actual VMs.`,
				{ modal: true },
				'Clear'
			);
			if (confirm === 'Clear') {
				await pendingStore.clear();
				await provider.refresh();
				vscode.window.showInformationMessage('Pending launches cleared.');
			}
		})
	);
}

// This method is called when your extension is deactivated
export function deactivate() {}
