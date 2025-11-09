// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import { MultipassService, createDefaultInstance, createDetailedInstance, launchInstance } from './multipassService';

import { WebviewContent } from './webviewContent';

// WebView provider for the sidebar view
class MultipassViewProvider implements vscode.WebviewViewProvider {
	private _view?: vscode.WebviewView;
	private _htmlInitialized = false;
	private _instanceTerminals: Map<string, vscode.Terminal[]> = new Map();

	constructor(private readonly _extensionUri: vscode.Uri) {}

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
					this.closeInstanceTerminals(message.instanceName);
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
					this.pollInstanceStatus(message.instanceName);
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
				if (!this._instanceTerminals.has(message.instanceName)) {
					this._instanceTerminals.set(message.instanceName, []);
				}
				this._instanceTerminals.get(message.instanceName)!.push(terminal);

				// Find the multipass path
				const multipassPath = '/usr/local/bin/multipass'; // Default, will try alternatives if needed
				terminal.sendText(`${multipassPath} shell ${message.instanceName} || /opt/homebrew/bin/multipass shell ${message.instanceName} || multipass shell ${message.instanceName}`);
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
						if (!this._instanceTerminals.has(message.instanceName)) {
							this._instanceTerminals.set(message.instanceName, []);
						}
						this._instanceTerminals.get(message.instanceName)!.push(terminal);

						// Find the multipass path
						const multipassPath = '/usr/local/bin/multipass'; // Default, will try alternatives if needed
						terminal.sendText(`${multipassPath} shell ${message.instanceName} || /opt/homebrew/bin/multipass shell ${message.instanceName} || multipass shell ${message.instanceName}`);
					}, 3000); // Wait 3 seconds for instance to start

					// Start polling for status updates
					this.pollInstanceStatus(message.instanceName);
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
								if (!this._instanceTerminals.has(message.instanceName)) {
									this._instanceTerminals.set(message.instanceName, []);
								}
								this._instanceTerminals.get(message.instanceName)!.push(terminal);

								// Find the multipass path
								const multipassPath = '/usr/local/bin/multipass'; // Default, will try alternatives if needed
								terminal.sendText(`${multipassPath} shell ${message.instanceName} || /opt/homebrew/bin/multipass shell ${message.instanceName} || multipass shell ${message.instanceName}`);
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
						this.closeInstanceTerminals(message.instanceName);
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
						this.closeInstanceTerminals(message.instanceName);
						await this.refresh();
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
						this.closeInstanceTerminals(message.instanceName);
						await this.refresh();
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
		let instanceName: string | undefined;
		let imageRelease: string | undefined;

		// createDefaultInstance now handles name prompt, image selection, and progress feedback
		const result = await createDefaultInstance(undefined, {
			onInstanceNameSelected: (name) => {
				instanceName = name;
			},
			onImageSelected: (imageName, release) => {
				imageRelease = release;
			},
			onLaunchStarted: async () => {
				// Optimistically add the instance to the list with "Downloading Image" state
				if (this._view && instanceName) {
					const currentLists = await MultipassService.getInstanceLists();
					const newInstance = {
						name: instanceName,
						state: 'Downloading Image',
						ipv4: '',
						release: imageRelease ? `Ubuntu ${imageRelease}` : 'Ubuntu'
					};
					currentLists.active.push(newInstance);
					this._view.webview.postMessage({
						command: 'updateInstances',
						instanceLists: currentLists
					});
				}
			}
		});

		if (result) {
			// Instance was created successfully, poll for status
			await this.pollInstanceStatus(result);
		} else {
			// Creation was cancelled or failed, just refresh
			await this.refresh();
		}
	}

	public async createDetailedInstance(): Promise<void> {
		const config = await createDetailedInstance();
		if (config) {
			// Optimistically add the instance to the list with "Creating" state
			if (this._view) {
				const currentLists = await MultipassService.getInstanceLists();
				const newInstance = {
					name: config.name,
					state: 'Creating',
					ipv4: '',
					release: 'Ubuntu 22.04 LTS' // Default, will be updated when instance is created
				};
				currentLists.active.push(newInstance);
				this._view.webview.postMessage({
					command: 'updateInstances',
					instanceLists: currentLists
				});
			}

			// Launch the instance with the custom configuration
			const result = await launchInstance({
				name: config.name,
				cpus: config.cpus,
				memory: config.memory,
				disk: config.disk
			});

			if (result.success) {
				// Start polling for the instance status
				await this.pollInstanceStatus(config.name);
			} else {
				// If creation failed, refresh to remove the optimistic instance
				vscode.window.showErrorMessage(`Failed to create instance: ${result.error}`);
				await this.refresh();
			}
		}
	}

	private closeInstanceTerminals(instanceName: string): void {
		const terminals = this._instanceTerminals.get(instanceName);
		if (terminals) {
			// Close all terminals for this instance
			terminals.forEach(terminal => {
				terminal.dispose();
			});
			// Clear the array
			this._instanceTerminals.delete(instanceName);
		}
	}

	public handleTerminalClosed(terminal: vscode.Terminal): void {
		// Remove this terminal from our tracking
		for (const [instanceName, terminals] of this._instanceTerminals.entries()) {
			const index = terminals.indexOf(terminal);
			if (index !== -1) {
				terminals.splice(index, 1);
				// If no more terminals for this instance, remove the entry
				if (terminals.length === 0) {
					this._instanceTerminals.delete(instanceName);
				}
				break;
			}
		}
	}

	private async pollInstanceStatus(instanceName: string, maxAttempts: number = 60): Promise<void> {
		// Don't refresh immediately - the optimistic update already added it
		// Just start polling

		let attempts = 0;
		const pollInterval = setInterval(async () => {
			attempts++;
			const instances = await MultipassService.getInstances();
			const instance = instances.find(i => i.name === instanceName);

			if (instance && instance.state.toLowerCase() === 'running') {
				clearInterval(pollInterval);
				vscode.window.showInformationMessage(`Instance '${instanceName}' is now running`);
				await this.refresh();
			} else if (instance) {
				// Instance exists but not running yet - refresh to show current state
				await this.refresh();
			} else if (attempts >= maxAttempts) {
				clearInterval(pollInterval);
				vscode.window.showWarningMessage(`Instance '${instanceName}' is taking longer than expected to start`);
				await this.refresh();
			}
		}, 2000); // Poll every 2 seconds
	}

	public async refresh(): Promise<void> {
		if (!this._view) {
			return;
		}

		const instanceLists = await MultipassService.getInstanceLists();

		// If webview HTML is not set yet, set it with initial data
		if (!this._htmlInitialized) {
			this._view.webview.html = WebviewContent.getHtml(instanceLists, this._view.webview, this._extensionUri);
			this._htmlInitialized = true;
		} else {
			// Otherwise, just update the React state via message
			this._view.webview.postMessage({
				command: 'updateInstances',
				instanceLists: instanceLists
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

	// Register the webview view provider
	const provider = new MultipassViewProvider(context.extensionUri);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider('multipass-run-view', provider)
	);

	// Listen for terminal close events to clean up our tracking
	context.subscriptions.push(
		vscode.window.onDidCloseTerminal(terminal => {
			provider.handleTerminalClosed(terminal);
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
					label: '$(add) Create Instance',
					description: 'Create a new instance with default settings',
					id: 'create-default'
				},
				{
					label: '$(file) Create from Profile',
					description: 'Create instance using a saved profile',
					id: 'create-profile'
				},
				{
					label: '$(settings-gear) Create Detailed',
					description: 'Create instance with custom configuration',
					id: 'create-detailed'
				},
				{
					label: '$(file-code) Create from YAML',
					description: 'Create instance from a YAML configuration file',
					id: 'create-yaml'
				}
			];

			const selected = await vscode.window.showQuickPick(options, {
				placeHolder: 'Select instance creation method',
				title: 'Create Multipass Instance'
			});

			if (selected) {
				switch (selected.id) {
					case 'create-default':
						await provider.createDefaultInstance();
						break;
					case 'create-profile':
						vscode.window.showInformationMessage('Create from Profile - Coming soon!');
						break;
				case 'create-detailed':
					await provider.createDetailedInstance();
					break;
					case 'create-yaml':
						vscode.window.showInformationMessage('Create from YAML - Coming soon!');
						break;
				}
			}
		})
	);
}

// This method is called when your extension is deactivated
export function deactivate() {}
