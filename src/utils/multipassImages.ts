export type MultipassDistro = 'ubuntu' | 'fedora' | 'debian';

export interface MultipassImage {
	name: string;
	aliases: string[];
	os: string;
	release: string;
	remote: string;
	version: string;
}

export interface FindImagesResult {
	images: Record<string, MultipassImage>;
	blueprints: Record<string, MultipassImage>;
	errors: string[];
}

export interface MultipassImageOption {
	imageKey: string;
	label: string;
	description?: string;
	detail?: string;
	release: string;
	distro: MultipassDistro;
	isLts: boolean;
}

export function parseFindImagesJson(stdout: string): FindImagesResult {
	const data = JSON.parse(stdout);
	return {
		images: data.images || {},
		blueprints: data['blueprints (deprecated)'] || data.blueprints || {},
		errors: data.errors || [],
	};
}

function imageMatchesDistro(key: string, image: MultipassImage, distro: MultipassDistro): boolean {
	const haystack = [
		key,
		image.os,
		image.release,
		...(image.aliases ?? []),
	].join(' ').toLowerCase();
	return haystack.includes(distro);
}

export function sortImageEntries(a: [string, MultipassImage], b: [string, MultipassImage]): number {
	const aLts = a[1].release.includes('LTS');
	const bLts = b[1].release.includes('LTS');
	if (aLts !== bLts) {
		return aLts ? -1 : 1;
	}
	return b[0].localeCompare(a[0], undefined, {
		numeric: true,
		sensitivity: 'base',
	});
}

export function getImageEntriesForDistro(
	images: Record<string, MultipassImage>,
	distro: MultipassDistro
): Array<[string, MultipassImage]> {
	return Object.entries(images)
		.filter(([key, image]) => imageMatchesDistro(key, image, distro))
		.sort(sortImageEntries);
}

export function buildImageOptions(
	images: Record<string, MultipassImage>,
	distro: MultipassDistro
): MultipassImageOption[] {
	return getImageEntriesForDistro(images, distro).map(([key, image]) => ({
		imageKey: key,
		label: `${image.os} ${image.release}`,
		description: image.aliases.length > 0 ? `(${image.aliases.join(', ')})` : undefined,
		detail: `Version: ${image.version}${image.remote ? ` - Remote: ${image.remote}` : ''}`,
		release: `${image.os} ${image.release}`,
		distro,
		isLts: image.release.includes('LTS'),
	}));
}

export function pickImageForDistro(
	images: Record<string, MultipassImage>,
	distro: MultipassDistro
): { imageKey?: string; release: string } | undefined {
	if (distro === 'ubuntu') {
		return { release: 'Ubuntu LTS' };
	}

	const [imageKey, image] = getImageEntriesForDistro(images, distro)[0] ?? [];
	if (!image) {
		return undefined;
	}
	return {
		imageKey,
		release: `${image.os} ${image.release}`,
	};
}
