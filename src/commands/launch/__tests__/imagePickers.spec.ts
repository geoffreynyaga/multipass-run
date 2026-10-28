jest.mock('../../../utils/multipassFind', () => ({ findImages: jest.fn() }));
jest.mock('../instanceNameExists', () => ({ instanceNameExists: jest.fn(async () => false) }));

import * as vscode from 'vscode';

import { findImages } from '../../../utils/multipassFind';
import { createDefaultInstance } from '../createDefaultInstance';
import { createDetailedInstance } from '../createDetailedInstance';

it.each([createDefaultInstance, createDetailedInstance])('%p offers Fedora and Debian alongside the latest Ubuntu LTS', async (create) => {
	jest.mocked(vscode.window.showInputBox).mockResolvedValueOnce('test-vm');
	jest.mocked(vscode.window.showQuickPick).mockResolvedValueOnce(undefined);
	jest.mocked(findImages).mockResolvedValueOnce({
		images: Object.fromEntries([
			['24.04', 'Ubuntu', '24.04 LTS'], ['26.04', 'Ubuntu', '26.04 LTS'],
			['fedora:43', 'Fedora', '43'], ['debian:13', 'Debian', '13'],
		].map(([key, os, release]) => [key, { name: key, os, release, aliases: [], remote: '', version: '1' }])),
		blueprints: {}, errors: [],
	});
	await create();
	expect(vscode.window.showQuickPick).toHaveBeenLastCalledWith(expect.arrayContaining([
		expect.objectContaining({ imageKey: '26.04', picked: true }),
		expect.objectContaining({ imageKey: '24.04', picked: false }),
		expect.objectContaining({ imageKey: 'fedora:43' }),
		expect.objectContaining({ imageKey: 'debian:13' }),
	]), expect.anything());
});
