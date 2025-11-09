import { getInstanceLists } from '../commands/listInstances';

/**
 * Checks if an image is already downloaded by checking if any existing instance uses it
 * @param imageRelease The release string (e.g., "24.04 LTS", "43", "Trixie")
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
			const instanceRelease = instance.release.toLowerCase().trim();
			const targetRelease = imageRelease.toLowerCase().trim();

			// Extract the version/release part (remove OS name if present)
			// E.g., "Ubuntu 24.04 LTS" -> "24.04 lts", "Fedora 43" -> "43"
			const extractVersion = (release: string): string => {
				const parts = release.split(' ');
				// If first part is an OS name (Ubuntu, Fedora, Debian, etc.), skip it
				if (parts.length > 1 && /^(ubuntu|fedora|debian|core)/i.test(parts[0])) {
					return parts.slice(1).join(' ').toLowerCase();
				}
				return release.toLowerCase();
			};

			const instanceVersion = extractVersion(instanceRelease);
			const targetVersion = extractVersion(targetRelease);

			// Check if the versions match
			// Handle cases like "24.04 LTS" vs "24.04" or "43" vs "Fedora 43"
			return instanceVersion.includes(targetVersion) ||
			       targetVersion.includes(instanceVersion) ||
			       instanceRelease.includes(targetRelease) ||
			       targetRelease.includes(instanceRelease);
		});
	} catch (error) {
		console.error('Error checking if image is downloaded:', error);
		// If we can't determine, assume it's not downloaded (safer to show downloading)
		return false;
	}
}
