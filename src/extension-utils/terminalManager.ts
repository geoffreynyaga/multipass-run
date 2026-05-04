import * as vscode from 'vscode';

/**
 * Manages terminal instances for Multipass instances
 * Tracks which terminals belong to which instances for cleanup
 */
export class TerminalManager {
	private instanceTerminals: Map<string, vscode.Terminal[]> = new Map();

	/**
	 * Add a terminal to track for a specific instance
	 */
	public addTerminal(instanceName: string, terminal: vscode.Terminal): void {
		if (!this.instanceTerminals.has(instanceName)) {
			this.instanceTerminals.set(instanceName, []);
		}
		const terminalsForInstance = this.instanceTerminals.get(instanceName);
		if (terminalsForInstance) {
			terminalsForInstance.push(terminal);
		}
	}

	/**
	 * Close all terminals associated with an instance
	 */
	public closeInstanceTerminals(instanceName: string): void {
		const terminals = this.instanceTerminals.get(instanceName);
		if (terminals) {
			// Close all terminals for this instance
			terminals.forEach(terminal => {
				terminal.dispose();
			});
			// Clear the array
			this.instanceTerminals.delete(instanceName);
		}
	}

	/**
	 * Handle a terminal being closed (cleanup tracking)
	 */
	public handleTerminalClosed(terminal: vscode.Terminal): void {
		// Remove this terminal from our tracking
		for (const [instanceName, terminals] of this.instanceTerminals.entries()) {
			const index = terminals.indexOf(terminal);
			if (index !== -1) {
				terminals.splice(index, 1);
				// If no more terminals for this instance, remove the entry
				if (terminals.length === 0) {
					this.instanceTerminals.delete(instanceName);
				}
				break;
			}
		}
	}
}
