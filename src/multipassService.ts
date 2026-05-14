// SSH utilities — imported for the MultipassService class
import { deleteInstance as deleteInstanceCommand } from './commands/deleteInstance';
import { deleteSnapshot as deleteSnapshotCommand } from './commands/deleteSnapshot';
import { findImages as findImagesCommand } from './commands/findImages';
import { getInstanceInfo as getInstanceInfoCommand } from './commands/getInstanceInfo';
import { instanceNameExists as instanceNameExistsCommand } from './commands/launch/instanceNameExists';
// Instance commands — imported for the MultipassService class
import { getInstanceLists as getInstanceListsCommand, getInstances as getInstancesCommand } from './commands/listInstances';
import { listSnapshots as listSnapshotsCommand } from './commands/listSnapshots';
import { recoverInstance as recoverInstanceCommand } from './commands/recoverInstance';
import { restoreSnapshot as restoreSnapshotCommand } from './commands/restoreSnapshot';
import { startInstance as startInstanceCommand } from './commands/startInstance';
import { stopInstance as stopInstanceCommand } from './commands/stopInstance';
import { suspendInstance as suspendInstanceCommand } from './commands/suspendInstance';
import { takeSnapshot as takeSnapshotCommand } from './commands/takeSnapshot';
import { isImageAlreadyDownloaded as isImageAlreadyDownloadedCommand } from './utils/isImageAlreadyDownloaded';
import { setupSSH as setupSSHCommand } from './utils/setupSSH';
import {
	connectToInstanceViaSSH as connectToInstanceViaSSHCommand,
	countManagedSSHEntries as countManagedSSHEntriesCommand,
	openRemoteSSHView as openRemoteSSHViewCommand,
	pruneOrphanedSSHEntries as pruneOrphanedSSHEntriesCommand,
	removeManagedSSHKeyPair as removeManagedSSHKeyPairCommand,
	removeSSHConfigForInstance as removeSSHConfigForInstanceCommand,
	setupSSHForInstance as setupSSHForInstanceCommand,
} from './utils/sshConfig';

// Re-export types consumed by the webview
export type { MultipassInstanceInfo } from './commands/getInstanceInfo';
export type { InstanceLists } from './commands/listInstances';
export type { MultipassSnapshot } from './commands/listSnapshots';

// Re-export functions consumed directly (not via MultipassService)
export { createDefaultInstance } from './commands/launch/createDefaultInstance';
export { createDetailedInstance } from './commands/launch/createDetailedInstance';
export { launchInstance } from './commands/launch/launchInstance';

// Backward-compatible class-based API — consumers call MultipassService.xxx()
export class MultipassService {
	public static getInstances = getInstancesCommand;
	public static getInstanceLists = getInstanceListsCommand;
	public static getInstanceInfo = getInstanceInfoCommand;
	public static stopInstance = stopInstanceCommand;
	public static startInstance = startInstanceCommand;
	public static deleteInstance = deleteInstanceCommand;
	public static recoverInstance = recoverInstanceCommand;
	public static suspendInstance = suspendInstanceCommand;
	public static listSnapshots = listSnapshotsCommand;
	public static takeSnapshot = takeSnapshotCommand;
	public static restoreSnapshot = restoreSnapshotCommand;
	public static deleteSnapshot = deleteSnapshotCommand;
	public static findImages = findImagesCommand;
	public static setupSSHForInstance = setupSSHForInstanceCommand;
	public static removeSSHConfigForInstance = removeSSHConfigForInstanceCommand;
	public static connectToInstanceViaSSH = connectToInstanceViaSSHCommand;
	public static countManagedSSHEntries = countManagedSSHEntriesCommand;
	public static removeManagedSSHKeyPair = removeManagedSSHKeyPairCommand;
	public static pruneOrphanedSSHEntries = pruneOrphanedSSHEntriesCommand;
	public static openRemoteSSHView = openRemoteSSHViewCommand;
	public static isImageAlreadyDownloaded = isImageAlreadyDownloadedCommand;
	public static instanceNameExists = instanceNameExistsCommand;
	public static setupSSH = setupSSHCommand;
}
