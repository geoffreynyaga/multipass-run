/** @jest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { InlineLaunchForm } from '../InlineLaunchForm';
import type { InlineLaunchFormProps } from '../types';

function props(supportsFedora: boolean, supportsDebian: boolean): InlineLaunchFormProps {
	return {
		mode: 'quick',
		ubuntuIconUri: '', ubuntuDarkIconUri: '', fedoraIconUri: '', fedoraDarkIconUri: '', debianIconUri: '', debianDarkIconUri: '',
		multipassCapabilities: { supportsFedora, supportsDebian },
		inlineImageOptions: [], isLoadingInlineImages: false,
		onBack: jest.fn(), onLaunchFromInlineForm: jest.fn(), onRequestInlineImages: jest.fn(), onOptimisticLaunch: jest.fn(),
	};
}

it.each([[true, false], [false, true], [true, true], [false, false]])('shows only catalog-supported distro buttons (%s, %s)', (fedora, debian) => {
	render(<InlineLaunchForm {...props(fedora, debian)} />);
	expect(screen.queryByRole('button', { name: 'Fedora' }) !== null).toBe(fedora);
	expect(screen.queryByRole('button', { name: 'Debian' }) !== null).toBe(debian);
	expect(screen.getByRole('button', { name: 'Ubuntu' })).toBeDefined();
});

it('returns to Ubuntu if the selected distro disappears from the catalog', () => {
	const initial = props(true, true);
	const { rerender } = render(<InlineLaunchForm {...initial} />);
	fireEvent.click(screen.getByRole('button', { name: 'Fedora' }));
	rerender(<InlineLaunchForm {...initial} multipassCapabilities={{ supportsFedora: false, supportsDebian: true }} />);
	fireEvent.click(screen.getByRole('button', { name: 'Launch' }));
	expect(initial.onLaunchFromInlineForm).toHaveBeenCalledWith(expect.objectContaining({ distro: 'ubuntu' }));
});
