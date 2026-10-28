import { buildLaunchImageOptions, type FindImagesResult, type MultipassImage } from '../multipassImages';
import { capabilitiesFromImages } from '../multipassVersion';

function catalog(...distros: string[]): FindImagesResult {
	return {
		images: Object.fromEntries(distros.map((os) => [os.toLowerCase(), {
			name: os, aliases: [], os, release: 'Latest', remote: '', version: '1',
		}])),
		blueprints: {}, errors: [],
	};
}

describe('catalog capabilities', () => {
	it.each([
		[[], false, false],
		[['Ubuntu'], false, false],
		[['Ubuntu', 'Fedora'], true, false],
		[['Ubuntu', 'Debian'], false, true],
		[['Ubuntu', 'Fedora', 'Debian'], true, true],
	] as const)('detects %j independently', (distros, fedora, debian) => {
		expect(capabilitiesFromImages(catalog(...distros))).toEqual({ supportsFedora: fedora, supportsDebian: debian });
	});

	it('does not advertise alternative distros before a catalog is available', () => {
		expect(capabilitiesFromImages(null)).toEqual({ supportsFedora: false, supportsDebian: false });
	});
});

describe('launch image options', () => {
	it('offers all available distros in both wizard consumers, with the newest Ubuntu LTS first', () => {
		const images = catalog('Debian', 'Fedora').images;
		const ubuntu = (release: string): MultipassImage => ({ name: release, os: 'Ubuntu', release, aliases: [], remote: '', version: '1' });
		images['24.04'] = ubuntu('24.04 LTS');
		images['26.10'] = ubuntu('26.10');
		images['26.04'] = ubuntu('26.04 LTS');
		expect(buildLaunchImageOptions(images).map((option) => option.imageKey)).toEqual(['26.04', '24.04', '26.10', 'fedora', 'debian']);
	});

	it('omits absent distros and accepts an empty catalog', () => {
		expect(buildLaunchImageOptions(catalog('Fedora').images).map((option) => option.distro)).toEqual(['fedora']);
		expect(buildLaunchImageOptions({})).toEqual([]);
	});
});
