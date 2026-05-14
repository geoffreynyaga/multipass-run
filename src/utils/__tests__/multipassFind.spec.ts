jest.mock('../multipassExecutable', () => ({
	runMultipassCommand: jest.fn(),
}));

import { runMultipassCommand } from '../multipassExecutable';
import { findImages } from '../multipassFind';

const runMultipassCommandMock = runMultipassCommand as jest.MockedFunction<typeof runMultipassCommand>;

beforeEach(() => {
	runMultipassCommandMock.mockReset();
	jest.spyOn(console, 'error').mockImplementation(() => undefined);
	runMultipassCommandMock.mockResolvedValue({
		stdout: JSON.stringify({
			images: {
				noble: {
					aliases: ['24.04', 'lts'],
					os: 'Ubuntu',
					release: '24.04 LTS',
					remote: 'release',
					version: '20240530',
				},
			},
			'blueprints (deprecated)': {},
			errors: [],
		}),
		stderr: '',
	});
});

afterEach(() => {
	jest.restoreAllMocks();
	jest.clearAllMocks();
});

describe('findImages', () => {
	test('uses the shared multipass runner and parses images', async () => {
		const result = await findImages();

		expect(runMultipassCommandMock).toHaveBeenCalledWith(['find', '--format', 'json']);
		expect(result).toEqual({
			images: {
				noble: {
					aliases: ['24.04', 'lts'],
					os: 'Ubuntu',
					release: '24.04 LTS',
					remote: 'release',
					version: '20240530',
				},
			},
			blueprints: {},
			errors: [],
		});
	});

	test('returns null when the shared runner fails', async () => {
		runMultipassCommandMock.mockRejectedValueOnce(new Error('boom'));

		await expect(findImages()).resolves.toBeNull();
	});
});