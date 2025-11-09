import { connectToInstanceViaSSH as connectToInstanceViaSSHCommand, removeSSHConfigForInstance as removeSSHConfigForInstanceCommand, setupSSHForInstance as setupSSHForInstanceCommand } from './utils/sshConfig';
// Import functions from command modules
import { getInstanceLists as getInstanceListsCommand, getInstances as getInstancesCommand } from './commands/listInstances';

import { createDefaultInstance as createDefaultInstanceCommand } from './commands/launch/createDefaultInstance';
import { createDetailedInstance as createDetailedInstanceCommand } from './commands/launch/createDetailedInstance';
import { deleteInstance as deleteInstanceCommand } from './commands/deleteInstance';
import { findImages as findImagesCommand } from './commands/findImages';
import { getInstanceInfo as getInstanceInfoCommand } from './commands/getInstanceInfo';
import { instanceNameExists as instanceNameExistsCommand } from './commands/launch/instanceNameExists';
import { isImageAlreadyDownloaded as isImageAlreadyDownloadedCommand } from './utils/isImageAlreadyDownloaded';
import { launchInstance as launchInstanceCommand } from './commands/launch/launchInstance';
import { purgeInstance as purgeInstanceCommand } from './commands/purgeInstance';
import { recoverInstance as recoverInstanceCommand } from './commands/recoverInstance';
import { setupSSH as setupSSHCommand } from './utils/setupSSH';
import { shellInstance as shellInstanceCommand } from './commands/shell';
import { startInstance as startInstanceCommand } from './commands/startInstance';
import { stopInstance as stopInstanceCommand } from './commands/stopInstance';
import { suspendInstance as suspendInstanceCommand } from './commands/suspendInstance';

// Re-export types and functions
export type { MultipassInstance, InstanceLists } from './commands/listInstances';
export type { MultipassInstanceInfo } from './commands/getInstanceInfo';
export type { LaunchInstanceOptions } from './commands/launch/launchInstance';
export type { DetailedInstanceConfig } from './commands/launch/createDetailedInstance';
export type { MultipassImage, FindImagesResult } from './commands/findImages';
export type { CreateInstanceCallbacks, CreateInstanceResult } from './commands/launch/createDefaultInstance';
export type { SSHSetupResult } from './utils/sshConfig';
export { getInstances, getInstanceLists } from './commands/listInstances';
export { getInstanceInfo } from './commands/getInstanceInfo';
export { stopInstance } from './commands/stopInstance';
export { startInstance } from './commands/startInstance';
export { launchInstance } from './commands/launch/launchInstance';
export { createDefaultInstance } from './commands/launch/createDefaultInstance';
export { createDetailedInstance } from './commands/launch/createDetailedInstance';
export { deleteInstance } from './commands/deleteInstance';
export { recoverInstance } from './commands/recoverInstance';
export { purgeInstance } from './commands/purgeInstance';
export { suspendInstance } from './commands/suspendInstance';
export { shellInstance } from './commands/shell';
export { findImages } from './commands/findImages';
export { setupSSHForInstance, removeSSHConfigForInstance, connectToInstanceViaSSH } from './utils/sshConfig';
export { isImageAlreadyDownloaded } from './utils/isImageAlreadyDownloaded';
export { instanceNameExists } from './commands/launch/instanceNameExists';
export { setupSSH } from './utils/setupSSH';

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
	public static purgeInstance = purgeInstanceCommand;
	public static suspendInstance = suspendInstanceCommand;
	public static shellInstance = shellInstanceCommand;
	public static findImages = findImagesCommand;
	public static setupSSHForInstance = setupSSHForInstanceCommand;
	public static removeSSHConfigForInstance = removeSSHConfigForInstanceCommand;
	public static connectToInstanceViaSSH = connectToInstanceViaSSHCommand;
	public static isImageAlreadyDownloaded = isImageAlreadyDownloadedCommand;
	public static instanceNameExists = instanceNameExistsCommand;
	public static setupSSH = setupSSHCommand;
}

