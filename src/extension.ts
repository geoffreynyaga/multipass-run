// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as nodePath from 'path';
import * as nodeFs from 'fs';

import { MultipassService } from './multipassService';
import { WebviewContent } from './webviewContent';
import { capabilitiesFromImages } from './utils/multipassVersion';
import { launchInstance } from './commands/launch/launchInstance';
import type { MultipassCapabilities } from './utils/multipassVersion';
import { type FindImagesResult } from './utils/multipassImages';
import { mountFolder } from './commands/mountFolder';
import { isCloudInitFile } from './utils/cloudInitDetect';

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
import { type InstallPlan, detectInstallPlan } from './utils/installPackageManager';
import { createMessageDispatcher } from './webview-handlers/index';
import type { HandlerContext } from './webview-handlers/context';

// WebView provider for the sidebar view
class MultipassViewProvider implements vscode.WebviewViewProvider {
	private _view?: vscode.WebviewView;
	private _htmlInitialized = false;
	public terminalManager = new TerminalManager();
	private readonly _statusBarItem: vscode.StatusBarItem;
	private _multipassCapabilities: MultipassCapabilities = { supportsAlternativeDistros: false };
	private _cachedImages: FindImagesResult | null = null;
	private _imagesFetchPending = false;
	private _installPlan: InstallPlan | null = null;

	constructor(
		private readonly _extensionUri: vscode.Uri,
		public readonly pendingStore: PendingLaunchStore,
		private readonly _globalState: vscode.Memento
	) {
		this._statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
		this._statusBarItem.command = 'multipass-run.focus';
		this._statusBarItem.name = 'Multipass Run';
		this._statusBarItem.text = '$(vm) Multipass';
		this._statusBarItem.tooltip = 'Focus Multipass Run';
		this._statusBarItem.show();
	}

	public get statusBarItem(): vscode.StatusBarItem {
		return this._statusBarItem;
	}

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
		this._htmlInitialized = false;

		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [
				vscode.Uri.joinPath(this._extensionUri, 'media'),
				vscode.Uri.joinPath(this._extensionUri, 'dist')
			]
		};

		webviewView.onDidChangeVisibility(async () => {
			if (webviewView.visible) {
				await this.refresh();
			}
		});

		const self = this;
		const ctx: HandlerContext = {
			view: webviewView,
			pendingStore: this.pendingStore,
			terminalManager: this.terminalManager,
			get installPlan() { return self._installPlan; },
			get cachedImages() { return self._cachedImages; },
			get multipassCapabilities() { return self._multipassCapabilities; },
			postMessage: (msg) => webviewView.webview.postMessage(msg),
			setCachedImages: (images) => { self._cachedImages = images; },
			setMultipassCapabilities: (caps) => { self._multipassCapabilities = caps; },
			refresh: () => self.refresh(),
			createDefaultInstance: () => self.createDefaultInstance(),
			createDetailedInstance: () => self.createDetailedInstance(),
			launchCloudInitFromSidebar: () => self.launchCloudInitFromSidebar(),
			maybeOfferKeyRemovalPrompt: () => self.maybeOfferKeyRemovalPrompt(),
		};

		webviewView.webview.onDidReceiveMessage(createMessageDispatcher(ctx));

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

	private suggestVMNameFromFolder(folderName: string): string {
		// Sanitize: drop non-alphanumeric/dash, collapse repeats, strip leading/trailing dashes
		const cleaned = folderName
			.replace(/[^a-zA-Z0-9-]/g, '-')
			.replace(/-+/g, '-')
			.replace(/^-+|-+$/g, '')
			.toLowerCase();
		const safe = cleaned || 'instance';
		return /^[a-zA-Z]/.test(safe) ? safe : `vm-${safe}`;
	}

	private async launchAndTrack(opts: {
		instanceName: string;
		image?: string;
		release?: string;
		cpus?: string;
		memory?: string;
		disk?: string;
		cloudInitPath?: string;
		progressTitle: string;
		afterLaunch?: (progress: vscode.Progress<{ message?: string }>) => Promise<void>;
	}): Promise<boolean> {
		const release = opts.release ?? 'Ubuntu';

		await this.pendingStore.add({
			name: opts.instanceName,
			release,
			startedAt: Date.now(),
			status: 'launching',
			config: {
				image: opts.image,
				cpus: opts.cpus,
				memory: opts.memory,
				disk: opts.disk,
			},
		});

		// Optimistic sidebar row so the launch is visible immediately
		if (this._view) {
			const currentLists = await MultipassService.getInstanceLists();
			if (!currentLists.error) {
				const isImageCached = await MultipassService.isImageAlreadyDownloaded(release);
				currentLists.active.push({
					name: opts.instanceName,
					state: isImageCached ? 'Creating' : 'Downloading Image',
					ipv4: '',
					release,
				});
				this._view.webview.postMessage({
					command: 'updateInstances',
					instanceLists: currentLists,
				});
			}
		}

		// `multipass launch` blocks until cloud-init finishes — that can run for
		// minutes after the VM is already Running, mountable, and SSH-able. So
		// we run launch in the background and race it against a state poll:
		// whichever proves the VM is ready first wins, and we move on.
		const success = await vscode.window.withProgress(
			{
				location: vscode.ProgressLocation.Notification,
				title: opts.progressTitle,
				cancellable: false,
			},
			async (progress) => {
				const launchPromise = launchInstance({
					name: opts.instanceName,
					image: opts.image,
					cpus: opts.cpus,
					memory: opts.memory,
					disk: opts.disk,
					cloudInitPath: opts.cloudInitPath,
					onProgress: (msg) => progress.report({ message: msg }),
				});

				let launchSettled: Awaited<typeof launchPromise> | null = null;
				launchPromise.then(r => { launchSettled = r; }).catch(() => { /* tracked via timeout */ });

				const startMs = Date.now();
				const maxWaitMs = 5 * 60 * 1000;
				let running = false;

				while (Date.now() - startMs < maxWaitMs) {
					await new Promise(r => setTimeout(r, 3000));

					if (launchSettled) { break; }

					const lists = await MultipassService.getInstanceLists();
					if (!lists.error) {
						const inst = lists.active.find(x => x.name === opts.instanceName);
						if (inst) {
							progress.report({ message: `${inst.state}...` });
							if (inst.state.toLowerCase() === 'running') {
								running = true;
								break;
							}
						}
					}
				}

				// Resolve outcome
				if (launchSettled) {
					if (!(launchSettled as { success: boolean }).success) {
						vscode.window.showErrorMessage(
							`Failed to launch '${opts.instanceName}': ${(launchSettled as { error?: string }).error}`
						);
						return false;
					}
				} else if (!running) {
					vscode.window.showErrorMessage(
						`'${opts.instanceName}' did not reach Running within 5 minutes.`
					);
					return false;
				} else {
					// VM is Running but launch process is still wrapping up cloud-init.
					// Let it finish in the background so the daemon stays consistent.
					launchPromise.then(r => {
						if (!r.success) {
							console.warn(
								`[launchAndTrack] background launch for '${opts.instanceName}' resolved with error:`,
								r.error
							);
						}
					});
				}

				if (opts.afterLaunch) {
					await opts.afterLaunch(progress);
				}
				return true;
			}
		);

		await this.pendingStore.remove(opts.instanceName);

		if (success) {
			pollInstanceStatus(opts.instanceName, () => this.refresh());
			return true;
		} else {
			await this.refresh();
			return false;
		}
	}

	public async openFolderInMultipass(uri?: vscode.Uri): Promise<void> {
		// Resolve host folder path
		let folderPath: string | undefined;

		if (!uri) {
			// Empty-space click in explorer — resolve workspace root
			const roots = vscode.workspace.workspaceFolders ?? [];
			if (roots.length === 0) {
				const picked = await vscode.window.showOpenDialog({
					canSelectFolders: true,
					canSelectFiles: false,
					canSelectMany: false,
					openLabel: 'Open in Multipass',
				});
				if (!picked?.length) { return; }
				folderPath = picked[0].fsPath;
			} else if (roots.length === 1) {
				folderPath = roots[0].uri.fsPath;
			} else {
				const pick = await vscode.window.showQuickPick(
					roots.map(r => ({ label: r.name, description: r.uri.fsPath, fsPath: r.uri.fsPath })),
					{ title: 'Open in Multipass', placeHolder: 'Select workspace root to mount' }
				);
				if (!pick) { return; }
				folderPath = pick.fsPath;
			}
		} else {
			const stat = await vscode.workspace.fs.stat(uri);
			folderPath = stat.type === vscode.FileType.Directory
				? uri.fsPath
				: nodePath.dirname(uri.fsPath);
		}

		// Resolve symlinks — multipass can choke on some symlink chains
		try { folderPath = nodeFs.realpathSync(folderPath); } catch { /* keep original */ }

		const folderName = nodePath.basename(folderPath);
		const guestPath = `/home/ubuntu/${folderName}`;

		// Get instance list
		const lists = await MultipassService.getInstanceLists();
		if (lists.error) {
			vscode.window.showErrorMessage(`Cannot open in Multipass: ${lists.error.message}`);
			return;
		}

		type InstanceItem = vscode.QuickPickItem & { id: 'new' | 'existing'; vmName?: string; vmState?: string };

		const items: InstanceItem[] = [
			{
				label: '$(add) Launch new VM with this folder',
				description: `mounts ${folderPath} → ${guestPath}`,
				id: 'new',
			},
			...lists.active.map(i => ({
				label: `$(vm) ${i.name}`,
				description: i.state.toLowerCase() === 'running'
					? i.state
					: `${i.state} — will start first`,
				id: 'existing' as const,
				vmName: i.name,
				vmState: i.state,
			})),
		];

		const selected = await vscode.window.showQuickPick(items, {
			title: `Open in Multipass: ${folderName}`,
			placeHolder: 'Launch new VM or mount into existing instance',
		});

		if (!selected) { return; }

		if (selected.id === 'new') {
			const suggestedName = this.suggestVMNameFromFolder(folderName);

			const instanceName = await vscode.window.showInputBox({
				title: 'New VM name',
				value: suggestedName,
				prompt: 'Name for the new VM',
				validateInput: async (v) => {
					if (!v || !/^[a-zA-Z][a-zA-Z0-9-]*[a-zA-Z0-9]$/.test(v)) {
						return 'Must start with a letter, end with letter or digit, no spaces';
					}
					if (await MultipassService.instanceNameExists(v)) {
						return `'${v}' already exists`;
					}
					return null;
				},
			});
			if (!instanceName) { return; }

			let mountSucceeded = false;
			const ok = await this.launchAndTrack({
				instanceName,
				progressTitle: `Launching ${instanceName}`,
				afterLaunch: async (progress) => {
					progress.report({ message: 'Mounting folder...' });
					const mountResult = await mountFolder(instanceName, folderPath!, guestPath);
					if (mountResult.success) {
						mountSucceeded = true;
						vscode.window.showInformationMessage(
							`Mounted ${folderName} into '${instanceName}' at ${guestPath}`
						);
					} else {
						vscode.window.showWarningMessage(
							`'${instanceName}' launched but mount failed: ${mountResult.error}`
						);
					}
				},
			});

			// Auto-trigger SSH so a new window can open into the mounted folder.
			// Without this, a user unfamiliar with multipass has no obvious next step.
			if (ok && mountSucceeded) {
				await setupSSHConnection(instanceName, {
					onCancel: () => vscode.commands.executeCommand('workbench.view.extension.multipass-run-sidebar'),
				});
			}
		} else {
			const vmName = selected.vmName!;
			const isRunning = selected.vmState?.toLowerCase() === 'running';

			if (!isRunning) {
				const go = await vscode.window.showInformationMessage(
					`'${vmName}' is ${selected.vmState}. Start it and mount?`,
					'Start and Mount',
					'Cancel'
				);
				if (go !== 'Start and Mount') { return; }

				const startResult = await MultipassService.startInstance(vmName);
				if (!startResult.success) {
					vscode.window.showErrorMessage(`Failed to start '${vmName}': ${startResult.error}`);
					return;
				}

				// Poll until Running (3 s × 20 = 60 s ceiling). Track success so we
				// can surface a real error instead of letting mount fail confusingly.
				let started = false;
				await vscode.window.withProgress(
					{ location: vscode.ProgressLocation.Notification, title: `Starting ${vmName}...` },
					async () => {
						for (let i = 0; i < 20; i++) {
							await new Promise(r => setTimeout(r, 3000));
							const check = await MultipassService.getInstanceLists();
							if (!check.error) {
								const inst = check.active.find(x => x.name === vmName);
								if (inst?.state.toLowerCase() === 'running') {
									started = true;
									return;
								}
							}
						}
					}
				);
				await this.refresh();

				if (!started) {
					vscode.window.showErrorMessage(
						`'${vmName}' did not reach Running within 60 s. Mount aborted.`
					);
					return;
				}
			}

			const mountResult = await mountFolder(vmName, folderPath!, guestPath);
			if (mountResult.success) {
				vscode.window.showInformationMessage(
					`Mounted ${folderName} into '${vmName}' at ${guestPath}`
				);
				await this.refresh();
				// Same auto-SSH as the new-VM branch — give the user a path to
				// actually use the mounted folder without learning multipass first.
				await setupSSHConnection(vmName, {
					onCancel: () => vscode.commands.executeCommand('workbench.view.extension.multipass-run-sidebar'),
				});
			} else {
				vscode.window.showErrorMessage(`Mount failed: ${mountResult.error}`);
			}
		}
	}

	public async launchWithCloudInit(uri: vscode.Uri): Promise<void> {
		// Content sniff — filename when-clause matched on "cloud-init" but file
		// could be empty or unrelated; verify before launching arbitrary YAML.
		const detected = await isCloudInitFile(uri);

		if (!detected) {
			const go = await vscode.window.showWarningMessage(
				`'${nodePath.basename(uri.fsPath)}' doesn't look like a cloud-init file. Launch anyway?`,
				'Launch',
				'Cancel'
			);
			if (go !== 'Launch') { return; }
		}

		const instanceName = await vscode.window.showInputBox({
			title: 'New VM name',
			prompt: 'Name for the VM to launch with this cloud-init',
			placeHolder: 'my-instance',
			validateInput: async (v) => {
				if (!v || !/^[a-zA-Z][a-zA-Z0-9-]*[a-zA-Z0-9]$/.test(v)) {
					return 'Must start with a letter, end with letter or digit, no spaces';
				}
				if (await MultipassService.instanceNameExists(v)) {
					return `'${v}' already exists`;
				}
				return null;
			},
		});
		if (!instanceName) { return; }

		const ok = await this.launchAndTrack({
			instanceName,
			cloudInitPath: uri.fsPath,
			progressTitle: `Launching ${instanceName} with cloud-init`,
		});

		if (ok) {
			vscode.window.showInformationMessage(
				`Instance '${instanceName}' launched with cloud-init.`
			);
			// Auto-SSH so a non-multipass user gets a usable VS Code window
			// without having to discover the SSH action separately.
			await setupSSHConnection(instanceName);
		}
	}

	/**
	 * Sidebar "Open cloud-init YAML" entry point — file picker → validate → launch.
	 */
	public async launchCloudInitFromSidebar(): Promise<void> {
		const picked = await vscode.window.showOpenDialog({
			title: 'Open cloud-init YAML',
			canSelectFiles: true,
			canSelectFolders: false,
			canSelectMany: false,
			filters: { YAML: ['yaml', 'yml'] },
		});
		if (!picked?.length) { return; }

		const uri = picked[0];
		const detected = await isCloudInitFile(uri);

		if (!detected) {
			const go = await vscode.window.showWarningMessage(
				`'${nodePath.basename(uri.fsPath)}' doesn't look like a cloud-init file. Launch anyway?`,
				'Launch',
				'Cancel'
			);
			if (go !== 'Launch') { return; }
		}

		const instanceName = await vscode.window.showInputBox({
			title: 'New VM name',
			prompt: 'Name for the VM to launch with this cloud-init',
			placeHolder: 'my-instance',
			validateInput: async (v) => {
				if (!v || !/^[a-zA-Z][a-zA-Z0-9-]*[a-zA-Z0-9]$/.test(v)) {
					return 'Must start with a letter, end with letter or digit, no spaces';
				}
				if (await MultipassService.instanceNameExists(v)) {
					return `'${v}' already exists`;
				}
				return null;
			},
		});
		if (!instanceName) { return; }

		const ok = await this.launchAndTrack({
			instanceName,
			cloudInitPath: uri.fsPath,
			progressTitle: `Launching ${instanceName} with cloud-init`,
		});

		if (ok) {
			vscode.window.showInformationMessage(
				`Instance '${instanceName}' launched with cloud-init.`
			);
			await setupSSHConnection(instanceName);
		}
	}

	public async refresh(): Promise<void> {
		if (!this._view) {
			return;
		}

		const rawLists = await MultipassService.getInstanceLists();
		if (rawLists.error) {
			this._multipassCapabilities = { supportsAlternativeDistros: false };
			this._cachedImages = null;
		} else {
			this._multipassCapabilities = capabilitiesFromImages(this._cachedImages);
			if (!this._cachedImages && !this._imagesFetchPending) {
				this._imagesFetchPending = true;
				MultipassService.findImages().then(result => {
					this._cachedImages = result;
					this._imagesFetchPending = false;
					const caps = capabilitiesFromImages(result);
					this._multipassCapabilities = caps;
					this._view?.webview.postMessage({ command: 'multipassCapabilities', capabilities: caps });
				}).catch(() => {
					this._imagesFetchPending = false;
				});
			}
		}

		// Build (or clear) the install plan so the not-installed screen can show
		// a terminal-first CTA when a package manager is available on the host.
		if (rawLists.error?.type === 'not-installed') {
			try {
				this._installPlan = await detectInstallPlan();
			} catch (err) {
				console.warn('detectInstallPlan failed:', err);
				this._installPlan = null;
			}
		} else {
			this._installPlan = null;
		}

		// Reconcile pending launches against the real list. Drop ones that have
		// landed; flag ones that have been hanging past STUCK_THRESHOLD_MS.
		if (!rawLists.error) {
			await reconcilePending(this.pendingStore, rawLists);
		}
		const merged = rawLists.error
			? rawLists
			: mergePendingIntoLists(rawLists, this.pendingStore.list());

		this.updateStatusBar(merged);

		// If webview HTML is not set yet, set it with initial data
		if (!this._htmlInitialized) {
			this._view.webview.html = WebviewContent.getHtml(
				merged,
				this._view.webview,
				this._extensionUri,
				this._multipassCapabilities,
				this._installPlan
			);
			this._htmlInitialized = true;
		} else {
			// Otherwise, just update the React state via message
			this._view.webview.postMessage({
				command: 'updateInstances',
				instanceLists: merged
			});
			this._view.webview.postMessage({
				command: 'installPlan',
				plan: this._installPlan
			});
			this._view.webview.postMessage({
				command: 'multipassCapabilities',
				capabilities: this._multipassCapabilities
			});
		}
	}

	private updateStatusBar(instanceLists: Awaited<ReturnType<typeof MultipassService.getInstanceLists>>): void {
		if (instanceLists.error) {
			this._statusBarItem.text = '$(vm) Multipass';
			this._statusBarItem.tooltip = instanceLists.error.message;
			this._statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
			return;
		}

		const running = instanceLists.active.filter((i) => i.state.toLowerCase() === 'running');
		const pending = instanceLists.active.filter((i) => {
			const state = i.state.toLowerCase();
			return state.includes('downloading') || state === 'creating' || state === 'starting';
		});
		const errors = instanceLists.active.filter((i) => i.state.toLowerCase().includes('error'));

		this._statusBarItem.backgroundColor = undefined;
		if (errors.length > 0) {
			this._statusBarItem.text = `$(vm) ${running.length} running · ${errors.length} error`;
			this._statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
		} else if (pending.length > 0) {
			this._statusBarItem.text = `$(vm) ${running.length} running · ${pending.length} pending`;
		} else {
			this._statusBarItem.text = `$(vm) ${running.length} running`;
		}

		const lines = [
			running.length > 0 ? `Running: ${running.map((i) => i.name).join(', ')}` : 'Running: none',
			pending.length > 0 ? `Pending: ${pending.map((i) => i.name).join(', ')}` : undefined,
			errors.length > 0 ? `Errors: ${errors.map((i) => i.name).join(', ')}` : undefined,
			'Click to focus Multipass Run',
		].filter(Boolean);
		this._statusBarItem.tooltip = new vscode.MarkdownString(lines.join('\n\n'));
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
	context.subscriptions.push(provider.statusBarItem);

	context.subscriptions.push(
		vscode.commands.registerCommand('multipass-run.focus', async () => {
			await vscode.commands.executeCommand('workbench.view.extension.multipass-run-sidebar');
		})
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

	// Register "Open in Multipass" — explorer folder/empty-space right-click
	context.subscriptions.push(
		vscode.commands.registerCommand('multipass-run.openInMultipass', (uri?: vscode.Uri) =>
			provider.openFolderInMultipass(uri)
		)
	);

	// Register "Launch with cloud-init" — explorer YAML right-click
	context.subscriptions.push(
		vscode.commands.registerCommand('multipass-run.launchWithCloudInit', (uri: vscode.Uri) =>
			provider.launchWithCloudInit(uri)
		)
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
