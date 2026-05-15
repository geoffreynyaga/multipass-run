import { type FindImagesResult,getImageEntriesForDistro } from './multipassImages';

export interface MultipassCapabilities {
	supportsAlternativeDistros: boolean;
}

export function capabilitiesFromImages(images: FindImagesResult | null): MultipassCapabilities {
	if (!images) {
		return { supportsAlternativeDistros: false };
	}
	return {
		supportsAlternativeDistros:
			getImageEntriesForDistro(images.images, 'fedora').length > 0 ||
			getImageEntriesForDistro(images.images, 'debian').length > 0,
	};
}
