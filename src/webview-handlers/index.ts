import * as vscode from 'vscode';
import type { HandlerContext } from './context';
import { handleDownloadMultipass, handleInstallViaTerminal, handleCopyInstallCommand, handleOpenInstallManagerHelp, handleOpenMultipassDocumentation } from './install';
import { handleCancelPendingLaunch, handleClearPendingLaunch, handleRetryPendingLaunch } from './pending';
import { handleGetInstanceInfo, handleStopInstance, handleSuspendInstance, handleStartInstance, handleRecoverInstance, handleDeleteInstance, handlePurgeInstance } from './instance';
import { handleAddMount, handleRemoveMount } from './mounts';
import { handleGetSnapshots, handleTakeSnapshot, handleRestoreSnapshot, handleDeleteSnapshot } from './snapshots';
import { handleShellInstance, handleSetupSSHInstance, handleStartAndShellInstance, handleRecoverAndShellInstance } from './shell';
import { handleLaunchInstance, handleLaunchCustomInstance, handleLaunchInlineInstance, handleGetInlineImageOptions, handleLaunchCloudInitInstance, handleLaunchProfileInstance } from './launch';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Handler = (msg: any, ctx: HandlerContext) => Promise<void>;

const HANDLERS: Record<string, Handler> = {
	refreshList:                 async (_m, ctx) => ctx.refresh(),
	downloadMultipass:           handleDownloadMultipass,
	installMultipassViaTerminal: handleInstallViaTerminal,
	copyInstallCommand:          handleCopyInstallCommand,
	openInstallManagerHelp:      handleOpenInstallManagerHelp,
	openMultipassDocumentation:  handleOpenMultipassDocumentation,
	cancelPendingLaunch:         handleCancelPendingLaunch,
	clearPendingLaunch:          handleClearPendingLaunch,
	retryPendingLaunch:          handleRetryPendingLaunch,
	getInstanceInfo:             handleGetInstanceInfo,
	openFullDiskAccessSettings:  async () => {
		if (process.platform === 'darwin') {
			vscode.env.openExternal(vscode.Uri.parse('x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles'));
		}
	},
	addMount:                    handleAddMount,
	removeMount:                 handleRemoveMount,
	getSnapshots:                handleGetSnapshots,
	takeSnapshot:                handleTakeSnapshot,
	restoreSnapshot:             handleRestoreSnapshot,
	deleteSnapshot:              handleDeleteSnapshot,
	stopInstance:                handleStopInstance,
	suspendInstance:             handleSuspendInstance,
	startInstance:               handleStartInstance,
	recoverInstance:             handleRecoverInstance,
	shellInstance:               handleShellInstance,
	setupSSHInstance:            handleSetupSSHInstance,
	startAndShellInstance:       handleStartAndShellInstance,
	recoverAndShellInstance:     handleRecoverAndShellInstance,
	launchInstance:              handleLaunchInstance,
	launchCustomInstance:        handleLaunchCustomInstance,
	launchInlineInstance:        handleLaunchInlineInstance,
	getInlineImageOptions:       handleGetInlineImageOptions,
	launchCloudInitInstance:     handleLaunchCloudInitInstance,
	launchProfileInstance:       handleLaunchProfileInstance,
	deleteInstance:              handleDeleteInstance,
	purgeInstance:               handlePurgeInstance,
};

export function createMessageDispatcher(ctx: HandlerContext) {
	return async (message: Record<string, unknown>): Promise<void> => {
		const handler = HANDLERS[message.command as string];
		if (handler) {
			await handler(message, ctx);
		}
	};
}
