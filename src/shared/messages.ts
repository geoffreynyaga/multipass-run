// Messages passed between the extension and the webview. Both sides import
// these types so a renamed command or a missing field fails to compile.
// Type-only imports keep Node code out of the webview bundle.
import type { MultipassInstanceInfo } from '../commands/getInstanceInfo';
import type { InstanceLists } from '../commands/listInstances';
import type { MultipassSnapshot } from '../commands/listSnapshots';
import type { ZonesResult } from '../commands/zones';
import type { InstallPlan } from '../utils/installPackageManager';
import type { MultipassDistro, MultipassImageOption } from '../utils/multipassImages';
import type { MultipassCapabilities } from '../utils/multipassVersion';

export interface InlineLaunchConfig {
	mode: 'quick' | 'custom';
	name?: string;
	distro: MultipassDistro;
	image?: string;
	imageRelease?: string;
	cpus?: string;
	memory?: string;
	disk?: string;
	enableSSH?: boolean;
}

type InstanceCommand =
	| 'cancelPendingLaunch'
	| 'retryPendingLaunch'
	| 'getInstanceInfo'
	| 'addMount'
	| 'getSnapshots'
	| 'startInstance'
	| 'stopInstance'
	| 'suspendInstance'
	| 'recoverInstance'
	| 'deleteInstance'
	| 'purgeInstance'
	| 'shellInstance'
	| 'setupSSHInstance'
	| 'startAndShellInstance'
	| 'recoverAndShellInstance';

type PlainCommand =
	| 'refreshList'
	| 'getZones'
	| 'downloadMultipass'
	| 'installMultipassViaTerminal'
	| 'copyInstallCommand'
	| 'openInstallManagerHelp'
	| 'openMultipassDocumentation'
	| 'openFullDiskAccessSettings'
	| 'launchInstance'
	| 'launchCustomInstance'
	| 'launchCloudInitInstance'
	| 'launchProfileInstance';

/** Sent by the webview, handled in webview-handlers/. */
export type WebviewMessage =
	| { command: PlainCommand }
	| { command: 'setZoneAvailability'; zoneName: string; available: boolean }
	| { command: InstanceCommand; instanceName: string }
	| { command: 'clearPendingLaunch'; instanceName?: string }
	| { command: 'removeMount'; instanceName: string; guestPath: string }
	| { command: 'takeSnapshot'; instanceName: string; name?: string; comment?: string }
	| { command: 'restoreSnapshot' | 'deleteSnapshot'; instanceName: string; snapshotName: string }
	| { command: 'launchInlineInstance'; config: InlineLaunchConfig }
	| { command: 'getInlineImageOptions'; distro: MultipassDistro };

export type WebviewCommand = WebviewMessage['command'];

/** Sent by the extension, handled in webview/App.tsx. */
export type ExtensionMessage =
	| { command: 'suspendActionResult'; instanceName: string; success: boolean }
	| { command: 'zones'; result: ZonesResult }
	| { command: 'zoneActionResult'; zoneName: string; success: boolean; cancelled?: boolean; error?: string }
	| { command: 'updateInstances'; instanceLists: InstanceLists }
	| { command: 'instanceInfo'; info: MultipassInstanceInfo }
	| { command: 'multipassCapabilities'; capabilities: MultipassCapabilities }
	| { command: 'installPlan'; plan: InstallPlan | null }
	| { command: 'inlineImageOptions'; options: MultipassImageOption[] }
	| { command: 'inlineImageOptionsError'; error: string }
	| { command: 'snapshots'; instanceName: string; snapshots: MultipassSnapshot[] }
	| {
			command: 'snapshotActionResult';
			instanceName: string;
			snapshotName?: string;
			action: 'take' | 'restore' | 'delete';
			success: boolean;
			cancelled?: boolean;
			error?: string;
	  };
