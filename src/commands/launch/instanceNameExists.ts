import { getInstanceLists } from '../listInstances';

/**
 * Checks if an instance with the given name already exists
 * @param name The instance name to check
 * @returns true if instance exists, false otherwise
 */
export async function instanceNameExists(name: string): Promise<boolean> {
	try {
		const instanceLists = await getInstanceLists();

		// Check both active and deleted instances
		const allInstances = [...instanceLists.active, ...instanceLists.deleted];

		// Check if any instance has this exact name (case-insensitive)
		return allInstances.some(instance =>
			instance.name.toLowerCase() === name.toLowerCase()
		);
	} catch (error) {
		console.error('Error checking if instance name exists:', error);
		// If we can't determine, assume it doesn't exist
		return false;
	}
}
