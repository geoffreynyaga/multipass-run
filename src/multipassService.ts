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
	hasManagedSSHKeyPair as hasManagedSSHKeyPairCommand,
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

// Facade over the individual command functions — consumers call
// MultipassService.xxx(). A plain object rather than a class because it is
// never instantiated, extended, or used as a type; it only groups functions.
export const MultipassService = {
	getInstances: getInstancesCommand,
	getInstanceLists: getInstanceListsCommand,
	getInstanceInfo: getInstanceInfoCommand,
	stopInstance: stopInstanceCommand,
	startInstance: startInstanceCommand,
	deleteInstance: deleteInstanceCommand,
	recoverInstance: recoverInstanceCommand,
	suspendInstance: suspendInstanceCommand,
	listSnapshots: listSnapshotsCommand,
	takeSnapshot: takeSnapshotCommand,
	restoreSnapshot: restoreSnapshotCommand,
	deleteSnapshot: deleteSnapshotCommand,
	findImages: findImagesCommand,
	setupSSHForInstance: setupSSHForInstanceCommand,
	removeSSHConfigForInstance: removeSSHConfigForInstanceCommand,
	connectToInstanceViaSSH: connectToInstanceViaSSHCommand,
	countManagedSSHEntries: countManagedSSHEntriesCommand,
	hasManagedSSHKeyPair: hasManagedSSHKeyPairCommand,
	removeManagedSSHKeyPair: removeManagedSSHKeyPairCommand,
	pruneOrphanedSSHEntries: pruneOrphanedSSHEntriesCommand,
	openRemoteSSHView: openRemoteSSHViewCommand,
	isImageAlreadyDownloaded: isImageAlreadyDownloadedCommand,
	instanceNameExists: instanceNameExistsCommand,
	setupSSH: setupSSHCommand,
} as const;
