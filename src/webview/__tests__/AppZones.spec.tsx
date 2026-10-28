/** @jest-environment jsdom */
jest.mock('../components/zones.css', () => ({}));
jest.mock('../components/InstanceList', () => ({
	__esModule: true,
	default: ({ onViewZone }: { onViewZone: (name: string) => void }) => <button onClick={() => onViewZone('zone2')}>View zone2</button>,
}));

import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import type { ExtensionMessage } from '../../shared/messages';

const postMessage = jest.fn();
Object.defineProperty(globalThis, 'acquireVsCodeApi', { value: () => ({ postMessage }), configurable: true });
const App = require('../App').default;

function receive(message: ExtensionMessage) {
	act(() => { window.dispatchEvent(new MessageEvent('message', { data: message })); });
}

beforeEach(() => {
	jest.useFakeTimers();
	window.initialState = { active: [], deleted: [] };
});

afterEach(() => { jest.useRealTimers(); });

it('loads zones on selection and polls only while the Zones tab is active', () => {
	render(<App />);
	expect(postMessage).not.toHaveBeenCalledWith({ command: 'getZones' });
	fireEvent.click(screen.getByRole('tab', { name: 'Zones' }));
	expect(postMessage).toHaveBeenCalledWith({ command: 'getZones' });
	receive({ command: 'zones', result: { zones: [] } });
	postMessage.mockClear();
	act(() => { jest.advanceTimersByTime(5000); });
	expect(postMessage).toHaveBeenCalledWith({ command: 'getZones' });
	fireEvent.click(screen.getByRole('tab', { name: 'VMs' }));
	postMessage.mockClear();
	act(() => { jest.advanceTimersByTime(10000); });
	expect(postMessage).not.toHaveBeenCalled();
});

it('supports keyboard navigation between the tabs', () => {
	render(<App />);
	fireEvent.keyDown(screen.getByRole('tab', { name: 'VMs' }), { key: 'ArrowRight' });
	expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Zones' }));
	expect(screen.getByRole('tab', { name: 'Zones' }).getAttribute('aria-selected')).toBe('true');
	fireEvent.keyDown(screen.getByRole('tab', { name: 'Zones' }), { key: 'Home' });
	expect(screen.getByRole('tab', { name: 'VMs' }).getAttribute('aria-selected')).toBe('true');
});

it('routes VM zone links to Zones and clears pending UI state after cancel', () => {
	render(<App />);
	fireEvent.click(screen.getByRole('button', { name: 'View zone2' }));
	receive({ command: 'zones', result: { zones: [{ name: 'zone2', available: true, subnet: '10.42.1.0/24' }] } });
	fireEvent.click(screen.getByRole('button', { name: 'Disable zone2' }));
	expect(postMessage).toHaveBeenCalledWith({ command: 'setZoneAvailability', zoneName: 'zone2', available: false });
	expect(screen.getByRole('button', { name: 'Disable zone2' }).hasAttribute('disabled')).toBe(true);
	receive({ command: 'zoneActionResult', zoneName: 'zone2', success: false, cancelled: true });
	expect(screen.getByRole('button', { name: 'Disable zone2' }).hasAttribute('disabled')).toBe(false);
});
