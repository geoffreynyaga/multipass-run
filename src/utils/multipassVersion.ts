import { type FindImagesResult, getImageEntriesForDistro } from './multipassImages';

export interface MultipassCapabilities {
	supportsFedora: boolean;
	supportsDebian: boolean;
}

export function capabilitiesFromImages(images: FindImagesResult | null): MultipassCapabilities {
	return {
		supportsFedora: !!images && getImageEntriesForDistro(images.images, 'fedora').length > 0,
		supportsDebian: !!images && getImageEntriesForDistro(images.images, 'debian').length > 0,
	};
}
