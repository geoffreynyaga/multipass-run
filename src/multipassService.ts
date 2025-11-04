// Import functions from command modules
import { getInstances as getInstancesCommand } from './commands/listInstances';
import { getInstanceInfo as getInstanceInfoCommand } from './commands/getInstanceInfo';
import { stopInstance as stopInstanceCommand } from './commands/stopInstance';

// Re-export types and functions
export type { MultipassInstance } from './commands/listInstances';
export type { MultipassInstanceInfo } from './commands/getInstanceInfo';
export { getInstances } from './commands/listInstances';
export { getInstanceInfo } from './commands/getInstanceInfo';
export { stopInstance } from './commands/stopInstance';

// Maintain backward compatibility with class-based API
export class MultipassService {
	public static getInstances = getInstancesCommand;
	public static getInstanceInfo = getInstanceInfoCommand;
	public static stopInstance = stopInstanceCommand;
}
