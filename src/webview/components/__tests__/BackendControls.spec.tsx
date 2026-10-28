/** @jest-environment jsdom */
import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { getBackendSupport } from '../../../shared/backendCapabilities';
import { InstanceDetails } from '../InstanceDetails';
import { InstanceContextMenu } from '../InstanceList/InstanceContextMenu';

function support(driver: string) {
	return getBackendSupport({ clientVersion: '1.17.0', daemonVersion: '1.17.0', driver, errors: [] });
}

function details(driver: string, state = 'Running'): React.ComponentProps<typeof InstanceDetails> {
	return {
		backendSupport: support(driver),
		info: { name: 'web', state, zone: 'zone1', snapshots: 0, ipv4: '', release: 'Ubuntu 26.04 LTS', imageRelease: '', cpus: '2', load: '', diskUsage: '', memoryUsage: '', mounts: '--', mountsList: [] },
		snapshots: [], hostPlatform: 'darwin', onOpenFullDiskAccessSettings: jest.fn(),
		onDelete: jest.fn(), onStart: jest.fn(), onStop: jest.fn(), onSuspend: jest.fn(), onShell: jest.fn(), onSetupSSH: jest.fn(), onRecover: jest.fn(), onPurge: jest.fn(),
		onTakeSnapshot: jest.fn(), onRestoreSnapshot: jest.fn(), onDeleteSnapshot: jest.fn(), onAddMount: jest.fn(), onRemoveMount: jest.fn(),
	};
}

it('disables AppleVZ suspend and replaces snapshot actions with their limitation', () => {
	const props = details('applevz');
	render(<InstanceDetails {...props} />);
	const suspend = screen.getByTitle(/Suspend is unavailable on AppleVZ/);
	expect(suspend.hasAttribute('disabled')).toBe(true);
	fireEvent.click(suspend);
	expect(props.onSuspend).not.toHaveBeenCalled();
	expect(screen.getByText(/Snapshots are unavailable on AppleVZ/)).toBeDefined();
	expect(screen.queryByTitle('Take snapshot')).toBeNull();
});

it.each(['qemu', 'hcs'])('keeps snapshot controls on stopped %s VMs', driver => {
	render(<InstanceDetails {...details(driver, 'Stopped')} />);
	expect(screen.getByTitle('Take snapshot').hasAttribute('disabled')).toBe(false);
});

it('clears the optimistic suspend state if the host rejects a stale request', () => {
	render(<InstanceDetails {...details('qemu')} />);
	fireEvent.click(screen.getByTitle('Suspend instance'));
	expect(screen.getByText('Suspending…')).toBeDefined();
	act(() => { window.dispatchEvent(new MessageEvent('message', { data: { command: 'suspendActionResult', instanceName: 'web', success: false } })); });
	expect(screen.getByTitle('Suspend instance')).toBeDefined();
});

it('prevents the right-click menu from bypassing AppleVZ suspend restrictions', () => {
	const onSuspend = jest.fn();
	render(<InstanceContextMenu backendSupport={support('applevz')} contextMenu={{ x: 0, y: 0, instanceName: 'web', state: 'Running' }}
		onClose={jest.fn()} onShellInstance={jest.fn()} onSuspendInstance={onSuspend} onStopInstance={jest.fn()} onStartInstance={jest.fn()}
		onStartAndShellInstance={jest.fn()} onRecoverInstance={jest.fn()} onRecoverAndShellInstance={jest.fn()} onPurgeInstance={jest.fn()} onDeleteInstance={jest.fn()} onClearPendingLaunch={jest.fn()} />);
	const pause = screen.getByTitle(/Suspend is unavailable on AppleVZ/);
	expect(pause.getAttribute('aria-disabled')).toBe('true');
	fireEvent.click(pause);
	expect(onSuspend).not.toHaveBeenCalled();
});

it('does not clear a pending stop when an earlier suspend request fails', () => {
	render(<InstanceDetails {...details('qemu')} />);
	fireEvent.click(screen.getByTitle('Stop instance'));
	act(() => { window.dispatchEvent(new MessageEvent('message', { data: { command: 'suspendActionResult', instanceName: 'web', success: false } })); });
	expect(screen.getByText('Stopping…')).toBeDefined();
});
