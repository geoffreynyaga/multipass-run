/** @jest-environment jsdom */
jest.mock('../zones.css', () => ({}));
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { ZonesView } from '../ZonesView';

const result = { zones: [
	{ name: 'zone1', available: true, subnet: '10.42.0.0/24' },
	{ name: 'zone2', available: false, subnet: '10.42.1.0/24' },
] };
const base = { result, instances: [], refreshing: false, pendingZone: null, actionError: null, selectedZone: null, onRefresh: jest.fn(), onChangeAvailability: jest.fn() };

it('shows availability, subnet and VM membership with the correct zone action', () => {
	render(<ZonesView {...base} instances={[{ name: 'web', state: 'Unavailable', ipv4: '', release: '', zone: { name: 'zone2', available: false } }]} />);
	expect(screen.getByText('10.42.1.0/24')).toBeDefined();
	expect(screen.getByRole('list', { name: 'VMs in zone2' }).textContent).toContain('webUnavailable');
	fireEvent.click(screen.getByRole('button', { name: 'Disable zone1' }));
	expect(base.onChangeAvailability).toHaveBeenCalledWith('zone1', false);
	fireEvent.click(screen.getByRole('button', { name: 'Enable zone2' }));
	expect(base.onChangeAvailability).toHaveBeenCalledWith('zone2', true);
});

it('disables every zone mutation while a zone is changing', () => {
	render(<ZonesView {...base} pendingZone="zone1" />);
	expect(screen.getByRole('button', { name: 'Disable zone1' }).hasAttribute('disabled')).toBe(true);
	expect(screen.getByRole('button', { name: 'Enable zone2' }).hasAttribute('disabled')).toBe(true);
});

it('shows load failures and prevents using stale zone data', () => {
	render(<ZonesView {...base} result={{ ...result, error: 'connection failed' }} />);
	expect(screen.getByRole('alert').textContent).toContain('connection failed');
	expect(screen.getByRole('button', { name: 'Disable zone1' }).hasAttribute('disabled')).toBe(true);
});

it('offers refresh for an empty or unsupported zone catalog', () => {
	render(<ZonesView {...base} result={{ zones: [] }} />);
	expect(screen.getByText(/No availability zones/)).toBeDefined();
	fireEvent.click(screen.getByRole('button', { name: 'Refresh zones' }));
	expect(base.onRefresh).toHaveBeenCalled();
});

it('does not steal focus again when polling refreshes the same selected zone', () => {
	const { rerender } = render(<ZonesView {...base} selectedZone="zone1" />);
	const button = screen.getByRole('button', { name: 'Disable zone1' });
	button.focus();
	rerender(<ZonesView {...base} selectedZone="zone1" result={{ zones: [...result.zones] }} />);
	expect(document.activeElement).toBe(button);
});
