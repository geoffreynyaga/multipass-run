import * as vscode from 'vscode';

import { AUTO_PRUNE_DELAY_MS } from '../config/timings';
import { MultipassService } from '../multipassService';
import { MultipassViewProvider } from '../MultipassViewProvider';
import { PendingLaunchStore } from './pendingLaunches';

export function registerCommands(
	context: vscode.ExtensionContext,
	provider: MultipassViewProvider,
	pendingStore: PendingLaunchStore
): void {
	context.subscriptions.push(
		vscode.commands.registerCommand('multipass-run.focus', async () => {
			await vscode.commands.executeCommand('workbench.view.extension.multipass-run-sidebar');
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('multipass-run.refresh', () => {
			provider.refresh();
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('multipass-run.createInstanceMenu', async () => {
			const options = [
				{ label: '$(add) Default', description: 'Ubuntu LTS, 1 CPU / 1G / 5G', id: 'create-default' },
				{ label: '$(settings-gear) Custom', description: 'Pick CPU, RAM, disk', id: 'create-detailed' },
				{ label: '$(file-code) Cloud-init', description: 'Launch from cloud-init YAML', id: 'create-cloud-init' },
				{ label: '$(file) Profile', description: 'Use a saved configuration', id: 'create-profile' },
			];

			const selected = await vscode.window.showQuickPick(options, {
				placeHolder: 'Pick a launch method',
				title: 'Launch Multipass Instance',
			});

			if (!selected) { return; }

			switch (selected.id) {
				case 'create-default':
					await provider.createDefaultInstance();
					break;
				case 'create-detailed':
					await provider.createDetailedInstance();
					break;
				case 'create-profile':
					vscode.window.showInformationMessage('Profile launches are coming soon.');
					break;
				case 'create-cloud-init':
					vscode.window.showInformationMessage('Cloud-init launches are coming soon.');
					break;
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('multipass-run.openInMultipass', (uri?: vscode.Uri) =>
			provider.openFolderInMultipass(uri)
		)
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('multipass-run.launchWithCloudInit', (uri: vscode.Uri) =>
			provider.launchWithCloudInit(uri)
		)
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('multipass-run.setupSSH', async () => {
			await MultipassService.setupSSH();
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('multipass-run.pruneOrphanedSSHEntries', async () => {
			try {
				const lists = await MultipassService.getInstanceLists();
				if (lists.error) {
					vscode.window.showErrorMessage(`Cannot prune: ${lists.error.message}`);
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

	// Auto-prune at activation: pick up SSH entries left by previous versions
	// or direct CLI deletes. Short delay lets the multipass daemon settle.
	setTimeout(async () => {
		try {
			const lists = await MultipassService.getInstanceLists();
			if (lists.error) { return; }
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
	}, AUTO_PRUNE_DELAY_MS);
}
