// Import functions from command modules
import { getInstanceLists as getInstanceListsCommand, getInstances as getInstancesCommand } from './commands/listInstances';

import { createDefaultInstance as createDefaultInstanceCommand } from './commands/launch/createDefaultInstance';
import { createDetailedInstance as createDetailedInstanceCommand } from './commands/launch/createDetailedInstance';
import { deleteInstance as deleteInstanceCommand } from './commands/deleteInstance';
import { recoverInstance as recoverInstanceCommand } from './commands/recoverInstance';
import { getInstanceInfo as getInstanceInfoCommand } from './commands/getInstanceInfo';
import { launchInstance as launchInstanceCommand } from './commands/launch/launchInstance';
import { startInstance as startInstanceCommand } from './commands/startInstance';
import { stopInstance as stopInstanceCommand } from './commands/stopInstance';

// Re-export types and functions
export type { MultipassInstance, InstanceLists } from './commands/listInstances';
export type { MultipassInstanceInfo } from './commands/getInstanceInfo';
export type { LaunchInstanceOptions } from './commands/launch/launchInstance';
export type { DetailedInstanceConfig } from './commands/launch/createDetailedInstance';
export { getInstances, getInstanceLists } from './commands/listInstances';
export { getInstanceInfo } from './commands/getInstanceInfo';
export { stopInstance } from './commands/stopInstance';
export { startInstance } from './commands/startInstance';
export { launchInstance } from './commands/launch/launchInstance';
export { createDefaultInstance } from './commands/launch/createDefaultInstance';
export { createDetailedInstance } from './commands/launch/createDetailedInstance';
export { deleteInstance } from './commands/deleteInstance';
export { recoverInstance } from './commands/recoverInstance';

// Maintain backward compatibility with class-based API
export class MultipassService {
	public static getInstances = getInstancesCommand;
	public static getInstanceLists = getInstanceListsCommand;
	public static getInstanceInfo = getInstanceInfoCommand;
	public static stopInstance = stopInstanceCommand;
	public static startInstance = startInstanceCommand;
	public static launchInstance = launchInstanceCommand;
	public static createDefaultInstance = createDefaultInstanceCommand;
	public static createDetailedInstance = createDetailedInstanceCommand;
	public static deleteInstance = deleteInstanceCommand;
	public static recoverInstance = recoverInstanceCommand;
}
