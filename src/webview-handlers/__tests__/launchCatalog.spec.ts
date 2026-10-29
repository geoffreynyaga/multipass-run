jest.mock('../../utils/multipassFind', () => ({ findImages: jest.fn() }));
jest.mock('../../commands/launch/launchInstance', () => ({ launchInstance: jest.fn() }));

import * as vscode from 'vscode';

import { launchInstance } from '../../commands/launch/launchInstance';
import { findImages } from '../../utils/multipassFind';
import type { FindImagesResult } from '../../utils/multipassImages';
import type { HandlerContext } from '../context';
import { handleLaunchInlineInstance } from '../launch';

const catalog: FindImagesResult = {
	images: {
		'fedora:43': { name: 'Fedora', os: 'Fedora', release: '43', aliases: [], remote: '', version: '1' },
	},
	blueprints: {}, errors: [],
};

function context(): HandlerContext {
	return {
		multipassCapabilities: { supportsFedora: false, supportsDebian: false },
		setCachedImages: jest.fn(), setMultipassCapabilities: jest.fn(), postMessage: jest.fn(), refresh: jest.fn(),
	} as unknown as HandlerContext;
}

beforeEach(() => {
	jest.mocked(findImages).mockResolvedValue(catalog);
	jest.mocked(launchInstance).mockResolvedValue({ success: true });
});

it('rejects a missing distro without falling back to a different image', async () => {
	await handleLaunchInlineInstance({ config: { mode: 'quick', distro: 'debian' } }, context());
	expect(launchInstance).not.toHaveBeenCalled();
	expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(expect.stringContaining('No debian image'));
});

it.each(['missing-image', 'fedora:43'])('rejects a missing or wrong-distro image %s', async (image) => {
	await handleLaunchInlineInstance({ config: { mode: 'custom', distro: 'ubuntu', image } }, context());
	expect(launchInstance).not.toHaveBeenCalled();
	expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(expect.stringContaining('selected image is no longer available for ubuntu'));
});

it('uses the fresh catalog even when cached capabilities did not offer Fedora', async () => {
	const ctx = context();
	await handleLaunchInlineInstance({ config: { mode: 'quick', distro: 'fedora' } }, ctx);
	expect(launchInstance).toHaveBeenCalledWith(expect.objectContaining({ image: 'fedora:43' }));
	expect(ctx.setMultipassCapabilities).toHaveBeenCalledWith({ supportsFedora: true, supportsDebian: false });
	expect(ctx.postMessage).toHaveBeenCalledWith({ command: 'multipassCapabilities', capabilities: { supportsFedora: true, supportsDebian: false } });
});

it('preserves detected backend information when refreshing distro capabilities', async () => {
	const ctx = context();
	const environment = { clientVersion: '1.17.0', daemonVersion: '1.17.0', driver: 'applevz', errors: [] };
	ctx.multipassCapabilities.environment = environment;
	await handleLaunchInlineInstance({ config: { mode: 'quick', distro: 'fedora' } }, ctx);
	expect(ctx.setMultipassCapabilities).toHaveBeenCalledWith({ supportsFedora: true, supportsDebian: false, environment });
	expect(ctx.postMessage).toHaveBeenCalledWith({ command: 'multipassCapabilities', capabilities: { supportsFedora: true, supportsDebian: false, environment } });
});
