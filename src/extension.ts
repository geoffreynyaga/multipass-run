// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import { MultipassService } from './multipassService';
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
			}
		});

		await this.refresh();
	}

	public async createDefaultInstance(): Promise<void> {
		// Prompt user for instance name
		const instanceName = await vscode.window.showInputBox({
			prompt: 'Enter a name for the new instance',
			placeHolder: 'my-instance',
			validateInput: (value) => {
				if (!value || value.trim() === '') {
					return 'Instance name cannot be empty';
				}
				if (!/^[a-zA-Z0-9-_]+$/.test(value)) {
					return 'Instance name can only contain letters, numbers, hyphens, and underscores';
				}
				return null;
			}
		});

		if (instanceName) {
			// Close the input and show progress
			vscode.window.withProgress(
				{
					location: vscode.ProgressLocation.Notification,
					title: `Creating instance '${instanceName}'`,
					cancellable: false
				},
				async (progress) => {
					progress.report({ increment: 0, message: 'Launching...' });

					const result = await MultipassService.launchInstance(instanceName);
					if (result.success) {
						progress.report({ increment: 50, message: 'Instance created, waiting for it to start...' });
						// Start polling for the new instance
						await this.pollInstanceStatusWithProgress(instanceName, progress, 60);
					} else {
						vscode.window.showErrorMessage(`Failed to create instance: ${result.error}`);
					}
					return Promise.resolve();
				}
			);
		}
	}

	public async createDetailedInstance(): Promise<void> {
		// Step 1: Instance Name
		const instanceName = await vscode.window.showInputBox({
			prompt: 'Step 1/4: Enter instance name',
			placeHolder: 'my-instance',
			validateInput: (value) => {
				if (!value || value.trim() === '') {
					return 'Instance name cannot be empty';
				}
				if (!/^[a-zA-Z][a-zA-Z0-9-]*[a-zA-Z0-9]$/.test(value)) {
					return 'Name must start with a letter and end with alphanumeric character';
				}
				return null;
			}
		});

		if (!instanceName) {
			return; // User cancelled
		}

		// Step 2: CPUs
		const cpusInput = await vscode.window.showInputBox({
			prompt: 'Step 2/4: Number of CPUs',
			placeHolder: '1',
			value: '1',
			validateInput: (value) => {
				const num = parseInt(value);
				if (isNaN(num) || num < 1) {
					return 'Must be a positive integer (minimum: 1)';
				}
				return null;
			}
		});

		if (!cpusInput) {
			return; // User cancelled
		}

		// Step 3: Memory
		const memoryInput = await vscode.window.showInputBox({
			prompt: 'Step 3/4: Memory size (e.g., 1G, 512M, 2048M)',
			placeHolder: '1G',
			value: '1G',
			validateInput: (value) => {
				if (!/^\d+(\.\d+)?[KMG]$/.test(value)) {
					return 'Format: number with K, M, or G suffix (e.g., 1G, 512M)';
				}
				// Validate minimum of 128M
				const match = value.match(/^(\d+(?:\.\d+)?)([KMG])$/);
				if (match) {
					const amount = parseFloat(match[1]);
					const unit = match[2];
					const bytes = unit === 'G' ? amount * 1024 * 1024 * 1024 :
					             unit === 'M' ? amount * 1024 * 1024 :
					             amount * 1024;
					if (bytes < 128 * 1024 * 1024) {
						return 'Minimum memory: 128M';
					}
				}
				return null;
			}
		});

		if (!memoryInput) {
			return; // User cancelled
		}

		// Step 4: Disk
		const diskInput = await vscode.window.showInputBox({
			prompt: 'Step 4/4: Disk size (e.g., 5G, 10G, 2048M)',
			placeHolder: '5G',
			value: '5G',
			validateInput: (value) => {
				if (!/^\d+(\.\d+)?[KMG]$/.test(value)) {
					return 'Format: number with K, M, or G suffix (e.g., 5G, 2048M)';
				}
				// Validate minimum of 512M
				const match = value.match(/^(\d+(?:\.\d+)?)([KMG])$/);
				if (match) {
					const amount = parseFloat(match[1]);
					const unit = match[2];
					const bytes = unit === 'G' ? amount * 1024 * 1024 * 1024 :
					             unit === 'M' ? amount * 1024 * 1024 :
					             amount * 1024;
					if (bytes < 512 * 1024 * 1024) {
						return 'Minimum disk: 512M';
					}
				}
				return null;
			}
		});

		if (!diskInput) {
			return; // User cancelled
		}

	// Show confirmation
	const confirm = await vscode.window.showInformationMessage(
		`Create instance with:\nName: ${instanceName}\nCPUs: ${cpusInput}\nMemory: ${memoryInput}\nDisk: ${diskInput}`,
		{ modal: true },
		'Create'
	);

	if (confirm !== 'Create') {
		return;
	}		// Create instance with specified parameters
		vscode.window.withProgress(
			{
				location: vscode.ProgressLocation.Notification,
				title: `Creating instance '${instanceName}'`,
				cancellable: false
			},
			async (progress) => {
				progress.report({ increment: 0, message: 'Launching with custom configuration...' });

				const result = await MultipassService.launchInstance({
					name: instanceName,
					cpus: cpusInput,
					memory: memoryInput,
					disk: diskInput
				});

				if (result.success) {
					progress.report({ increment: 50, message: 'Instance created, waiting for it to start...' });
					await this.pollInstanceStatusWithProgress(instanceName, progress, 60);
				} else {
					vscode.window.showErrorMessage(`Failed to create instance: ${result.error}`);
				}
				return Promise.resolve();
			}
		);
	}

	private async pollInstanceStatus(instanceName: string, maxAttempts: number = 30): Promise<void> {
		let attempts = 0;
		const pollInterval = setInterval(async () => {
			attempts++;
			const instances = await MultipassService.getInstances();
			const instance = instances.find(i => i.name === instanceName);

			if (instance && instance.state.toLowerCase() === 'running') {
				clearInterval(pollInterval);
				vscode.window.showInformationMessage(`Instance '${instanceName}' is now running`);
				await this.refresh();
			} else if (attempts >= maxAttempts) {
				clearInterval(pollInterval);
				vscode.window.showWarningMessage(`Instance '${instanceName}' is taking longer than expected to start`);
				await this.refresh();
			}
		}, 2000); // Poll every 2 seconds
	}

	private async pollInstanceStatusWithProgress(
		instanceName: string,
		progress: vscode.Progress<{ message?: string; increment?: number }>,
		maxAttempts: number = 60
	): Promise<void> {
		let attempts = 0;

		return new Promise((resolve) => {
			const pollInterval = setInterval(async () => {
				attempts++;
				const instances = await MultipassService.getInstances();
				const instance = instances.find(i => i.name === instanceName);

				if (instance && instance.state.toLowerCase() === 'running') {
					clearInterval(pollInterval);
					progress.report({ increment: 100, message: 'Instance is running!' });
					vscode.window.showInformationMessage(`Instance '${instanceName}' is now running`);
					await this.refresh();
					resolve();
				} else if (instance) {
					// Instance exists but not running yet
					const progressPercent = Math.min((attempts / maxAttempts) * 50, 50);
					progress.report({
						increment: progressPercent / attempts,
						message: `Starting (${attempts}/${maxAttempts})...`
					});
				} else if (attempts >= maxAttempts) {
					clearInterval(pollInterval);
					progress.report({ increment: 100, message: 'Timed out' });
					vscode.window.showWarningMessage(`Instance '${instanceName}' is taking longer than expected to start`);
					await this.refresh();
					resolve();
				}
			}, 2000); // Poll every 2 seconds
		});
	}

	public async refresh(): Promise<void> {
		if (!this._view) {
			return;
		}

		const instances = await MultipassService.getInstances();
		this._view.webview.html = WebviewContent.getHtml(instances, this._view.webview, this._extensionUri);
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
