import * as vscode from 'vscode';

import { getInstanceLists, type InstanceLists } from '../commands/listInstances';
import { getZones, setZoneAvailability, type ZonesResult } from '../commands/zones';
import { ZONE_QUERY_TIMEOUT_MS } from '../config/timings';
import { multipassErrorMessage } from '../utils/multipassExecutable';
import type { HandlerContext } from './context';

// Serialize zone mutations within this extension host. A refresh remains
// available while a mutation is in flight.
let changingZone = false;

async function readZoneContext(): Promise<{ result: ZonesResult; lists: InstanceLists }> {
	const [result, lists] = await Promise.all([getZones(), getInstanceLists({ timeout: ZONE_QUERY_TIMEOUT_MS })]);
	return { result: lists.error ? { ...result, error: lists.error.message } : result, lists };
}

export async function handleGetZones(_msg: unknown, ctx: HandlerContext): Promise<void> {
	const { result, lists } = await readZoneContext();
	if (!lists.error) {
		ctx.postMessage({ command: 'updateInstances', instanceLists: lists });
	}
	ctx.postMessage({ command: 'zones', result });
}

async function confirmZoneChange(name: string, available: boolean, lists: InstanceLists): Promise<boolean> {
	if (available) {
		return true;
	}
	const members = lists.active.filter(vm => vm.zone?.name === name);
	const detail = [
		'Running VMs will be forcefully powered off. Unsaved work may be lost, and all VMs in this zone will become unavailable.',
		members.length ? `Current VMs:\n${members.map(vm => `${vm.name} (${vm.state})`).join('\n')}` : 'There are currently no active VMs in this zone.',
		'Enabling this zone later restarts the VMs that were running before the outage.',
	].join('\n\n');
	return await vscode.window.showWarningMessage(`Disable ${name}?`, { modal: true, detail }, 'Disable zone') === 'Disable zone';
}

export async function handleSetZoneAvailability(msg: { zoneName: string; available: boolean }, ctx: HandlerContext): Promise<void> {
	const { zoneName, available } = msg;
	if (changingZone) {
		ctx.postMessage({ command: 'zoneActionResult', zoneName, success: false, error: 'Another zone change is in progress. Try again when it finishes.' });
		return;
	}
	changingZone = true;
	let success = false;
	let cancelled = false;
	let error: string | undefined;
	try {
		const { result, lists } = await readZoneContext();
		if (result.error) {
			throw new Error(result.error);
		}
		const zone = result.zones.find(candidate => candidate.name === zoneName);
		if (!zone || typeof available !== 'boolean') {
			throw new Error('The zone is no longer available. Refresh and try again.');
		}
		if (zone.available === available) {
			success = true;
			return;
		}
		if (!await confirmZoneChange(zoneName, available, lists)) {
			cancelled = true;
			return;
		}
		const action = await vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: `${available ? 'Enabling' : 'Disabling'} ${zoneName}`,
			cancellable: false,
		}, () => setZoneAvailability(zoneName, available));
		if (!action.success) {
			throw new Error(action.error || 'Zone change failed.');
		}
		success = true;
		if (!available) {
			lists.active.filter(vm => vm.zone?.name === zoneName).forEach(vm => ctx.terminalManager.closeInstanceTerminals(vm.name));
		}
		vscode.window.showInformationMessage(available
			? `${zoneName} enabled. VMs that were running before the outage are starting again.`
			: `${zoneName} disabled. Its VMs are unavailable until the zone is enabled.`);
	} catch (failure) {
		error = multipassErrorMessage(failure, 'Zone change failed.');
	} finally {
		// The bounded zone read updates the VM rows too. Refresh status-bar state
		// independently so an unrelated daemon stall cannot keep the tab busy.
		void ctx.refresh().catch(failure => console.warn('VM refresh after zone change failed:', failure));
		try {
			await handleGetZones(undefined, ctx);
		} finally {
			changingZone = false;
			ctx.postMessage({ command: 'zoneActionResult', zoneName, success, cancelled, error });
		}
	}
}
