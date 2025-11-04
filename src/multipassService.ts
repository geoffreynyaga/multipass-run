import { getInstanceInfo as getInstanceInfoCommand } from './commands/getInstanceInfo';
// Import functions from command modules
import { getInstances as getInstancesCommand } from './commands/listInstances';
import { launchInstance as launchInstanceCommand } from './commands/launchInstance';
import { startInstance as startInstanceCommand } from './commands/startInstance';
import { stopInstance as stopInstanceCommand } from './commands/stopInstance';

// Re-export types and functions
export type { MultipassInstance } from './commands/listInstances';
export type { MultipassInstanceInfo } from './commands/getInstanceInfo';
export type { LaunchInstanceOptions } from './commands/launchInstance';
export { getInstances } from './commands/listInstances';
export { getInstanceInfo } from './commands/getInstanceInfo';
export { stopInstance } from './commands/stopInstance';
export { startInstance } from './commands/startInstance';
export { launchInstance } from './commands/launchInstance';

// Maintain backward compatibility with class-based API
export class MultipassService {
	public static getInstances = getInstancesCommand;
	public static getInstanceInfo = getInstanceInfoCommand;
	public static stopInstance = stopInstanceCommand;
	public static startInstance = startInstanceCommand;
	public static launchInstance = launchInstanceCommand;
}
