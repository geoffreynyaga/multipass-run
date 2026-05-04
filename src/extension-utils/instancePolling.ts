import * as vscode from 'vscode';
import { MultipassService } from '../multipassService';

/**
 * Poll an instance's status until it's running or max attempts reached
 * Automatically refreshes the view when status changes
 */
export async function pollInstanceStatus(
	instanceName: string,
	onRefresh: () => Promise<void>,
	maxAttempts: number = 60
): Promise<void> {
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
			await onRefresh();
		} else if (instance) {
			// Instance exists but not running yet - refresh to show current state
			await onRefresh();
		} else if (attempts >= maxAttempts) {
			clearInterval(pollInterval);
			vscode.window.showWarningMessage(`Instance '${instanceName}' is taking longer than expected to start`);
			await onRefresh();
		}
	}, 2000); // Poll every 2 seconds
}
