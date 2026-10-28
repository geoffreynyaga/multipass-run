import './zones.css';

import React from 'react';

import type { MultipassInstance } from '../../commands/listInstances';
import type { MultipassZone, ZonesResult } from '../../commands/zones';

interface ZonesViewProps {
	result: ZonesResult | null;
	instances: MultipassInstance[];
	refreshing: boolean;
	pendingZone: string | null;
	actionError: string | null;
	selectedZone: string | null;
	onRefresh: () => void;
	onChangeAvailability: (name: string, available: boolean) => void;
}

function ZoneRow({ zone, members, selected, disabled, busy, onChange }: {
	zone: MultipassZone;
	members: MultipassInstance[];
	selected: boolean;
	disabled: boolean;
	busy: boolean;
	onChange: () => void;
}) {
	return (
		<li className={`zone-row${selected ? ' zone-row-selected' : ''}`} id={`zone-${zone.name}`} tabIndex={-1}>
			<div className="zone-row-heading">
				<h3>{zone.name}</h3>
				<span className={`zone-status ${zone.available ? 'zone-available' : 'zone-unavailable'}`}>
					{zone.available ? 'Available' : 'Unavailable'}
				</span>
			</div>
			<div className="zone-row-summary">
				<span className="zone-subnet">{zone.subnet || 'Subnet not reported'}</span>
				<button className="zone-button" type="button" disabled={disabled} onClick={onChange}
					aria-label={`${zone.available ? 'Disable' : 'Enable'} ${zone.name}`}
					title={zone.available ? 'Simulate an outage in this zone' : 'Restore availability and restart previously running VMs'}>
					{busy ? 'Working…' : zone.available ? 'Disable' : 'Enable'}
				</button>
			</div>
			{members.length > 0 ? (
				<ul className="zone-members" aria-label={`VMs in ${zone.name}`}>
					{members.map(vm => (
						<li key={vm.name}><span className="zone-vm-name">{vm.name}</span><span>{vm.state}</span></li>
					))}
				</ul>
			) : null}
		</li>
	);
}

// Dense rows and quiet separators follow claude-design/screens-detail.jsx DetailB
// and the list proportions in claude-design/uploads, using VS Code theme tokens.
export function ZonesView({ result, instances, refreshing, pendingZone, actionError, selectedZone, onRefresh, onChangeAvailability }: ZonesViewProps) {
	const selectedZoneExists = !!result?.zones.some(zone => zone.name === selectedZone);
	React.useEffect(() => {
		if (selectedZone) {
			const row = document.getElementById(`zone-${selectedZone}`);
			row?.focus({ preventScroll: true });
			row?.scrollIntoView?.({ block: 'nearest' });
		}
	}, [selectedZone, selectedZoneExists]);

	return (
		<div className="zones-view">
			<div className="zones-toolbar">
				<button className="zone-refresh" type="button" onClick={onRefresh} disabled={refreshing || !!pendingZone}
					aria-label={refreshing ? 'Refreshing zones' : 'Refresh zones'} title="Refresh zones">
					<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
						<path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9"/><path d="M13.5 2.5v3h-3"/>
					</svg>
				</button>
			</div>
			{actionError && <p className="zones-error" role="alert">{actionError}</p>}
			{result?.error && <div className="zones-error" role="alert"><p>Unable to refresh zones: {result.error}</p><p>Availability zones require Multipass 1.17 or newer. Refresh to try again.</p></div>}
			{!result && <p role="status">Loading availability zones…</p>}
			{result && !result.error && result.zones.length === 0 && <p>No availability zones were returned by Multipass.</p>}
			{result && result.zones.length > 0 && (
				<ul className="zone-list" aria-label="Availability zones">
					{result.zones.map(zone => <ZoneRow key={zone.name} zone={zone}
						members={instances.filter(vm => vm.zone?.name === zone.name)} selected={selectedZone === zone.name}
						disabled={!!pendingZone || !!result.error} busy={pendingZone === zone.name}
						onChange={() => onChangeAvailability(zone.name, !zone.available)} />)}
				</ul>
			)}
			<div className="zones-warning" role="note" aria-label="Zone outage warning">
				<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" aria-hidden="true">
					<path d="M8 1.5 15 14H1Z"/><path d="M8 5.5v4"/><circle cx="8" cy="12" r=".6" fill="currentColor" stroke="none"/>
				</svg>
				<span>Disable powers off running VMs. Enable restarts previously running VMs.</span>
			</div>
		</div>
	);
}
