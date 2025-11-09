import { getInstanceLists } from '../commands/listInstances';

/**
 * Checks if an image is already downloaded by checking if any existing instance uses it
 * @param imageRelease The release string (e.g., "24.04 LTS")
 * @returns true if the image is already downloaded, false otherwise
 */
export async function isImageAlreadyDownloaded(imageRelease: string): Promise<boolean> {
	try {
		const instanceLists = await getInstanceLists();
		
		// Check both active and deleted instances
		const allInstances = [...instanceLists.active, ...instanceLists.deleted];
		
		// If any instance has this release, the image is already downloaded
		return allInstances.some(instance => {
			// Normalize the release strings for comparison
			const instanceRelease = instance.release.toLowerCase();
			const targetRelease = imageRelease.toLowerCase();
			
			// Check if the release matches
			// Handle cases like "Ubuntu 24.04 LTS" vs "24.04 LTS"
			return instanceRelease.includes(targetRelease) || targetRelease.includes(instanceRelease);
		});
	} catch (error) {
		console.error('Error checking if image is downloaded:', error);
		// If we can't determine, assume it's not downloaded (safer to show downloading)
		return false;
	}
}
