// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import { MultipassService, createDefaultInstance, createDetailedInstance } from './multipassService';

import { WebviewContent } from './webviewContent';

// WebView provider for the sidebar view
class MultipassViewProvider implements vscode.WebviewViewProvider {
	private _view?: vscode.WebviewView;

	constructor(private readonly _extensionUri: vscode.Uri) {}

	public async resolveWebviewView(webviewView: vscode.WebviewView): Promise<void> {
		this._view = webviewView;

		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [
				vscode.Uri.joinPath(this._extensionUri, 'media')
			]
		};

		// Handle messages from the webview
		webviewView.webview.onDidReceiveMessage(async (message) => {
			if (message.command === 'getInstanceInfo') {
				const info = await MultipassService.getInstanceInfo(message.instanceName);
				if (info && this._view) {
					this._view.webview.postMessage({
						command: 'updateInstanceInfo',
						instanceName: message.instanceName,
						html: WebviewContent.getDetailedInfoHtml(info)
					});
				}
			} else if (message.command === 'stopInstance') {
				const result = await MultipassService.stopInstance(message.instanceName);
				if (result.success) {
					vscode.window.showInformationMessage(`Instance '${message.instanceName}' is stopping...`);
					// Refresh after a short delay to show stopped state
					setTimeout(async () => {
						await this.refresh();
						vscode.window.showInformationMessage(`Instance '${message.instanceName}' stopped`);
					}, 2000);
				} else {
					vscode.window.showErrorMessage(`Failed to stop instance '${message.instanceName}': ${result.error}`);
					await this.refresh();
				}
			} else if (message.command === 'startInstance') {
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
			} else if (message.command === 'launchInstance') {
				await this.createDefaultInstance();
			} else if (message.command === 'deleteInstance') {
				// Show confirmation dialog
				const confirm = await vscode.window.showWarningMessage(
					`Are you sure you want to delete instance '${message.instanceName}'?`,
					{ modal: true },
					'Delete',
					'Delete & Purge'
				);

				if (confirm === 'Delete' || confirm === 'Delete & Purge') {
					const purge = confirm === 'Delete & Purge';
					const result = await MultipassService.deleteInstance(message.instanceName, purge);

					if (result.success) {
						vscode.window.showInformationMessage(
							purge
								? `Instance '${message.instanceName}' deleted and purged`
								: `Instance '${message.instanceName}' deleted`
						);
						await this.refresh();
					} else {
						vscode.window.showErrorMessage(`Failed to delete instance '${message.instanceName}': ${result.error}`);
					}
				}
			} else if (message.command === 'recoverInstance') {
				const result = await MultipassService.recoverInstance(message.instanceName);
				if (result.success) {
					vscode.window.showInformationMessage(`Instance '${message.instanceName}' recovered`);
					await this.refresh();
				} else {
					vscode.window.showErrorMessage(`Failed to recover instance '${message.instanceName}': ${result.error}`);
				}
			} else if (message.command === 'purgeInstance') {
				const confirm = await vscode.window.showWarningMessage(
					`Are you sure you want to permanently purge instance '${message.instanceName}'? This cannot be undone.`,
					{ modal: true },
					'Purge'
				);

				if (confirm === 'Purge') {
					const result = await MultipassService.deleteInstance(message.instanceName, true);
					if (result.success) {
						vscode.window.showInformationMessage(`Instance '${message.instanceName}' purged`);
						await this.refresh();
					} else {
						vscode.window.showErrorMessage(`Failed to purge instance '${message.instanceName}': ${result.error}`);
					}
				}
			}
		});

		await this.refresh();
	}

	public async createDefaultInstance(): Promise<void> {
		const instanceName = await createDefaultInstance();
		if (instanceName) {
			await this.pollInstanceStatus(instanceName);
		}
	}

	public async createDetailedInstance(): Promise<void> {
		const config = await createDetailedInstance();
		if (config) {
			await this.pollInstanceStatus(config.name);
		}
	}

	private async pollInstanceStatus(instanceName: string, maxAttempts: number = 30): Promise<void> {
		// Refresh immediately to show the new instance
		await this.refresh();

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
		this._view.webview.html = WebviewContent.getHtml(instanceLists, this._view.webview, this._extensionUri);
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

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('multipass-run.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from Multipass Run!');
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
