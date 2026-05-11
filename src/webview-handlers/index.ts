import * as vscode from 'vscode';
import type { HandlerContext } from './context';
import { handleDownloadMultipass, handleInstallViaTerminal, handleCopyInstallCommand, handleOpenInstallManagerHelp, handleOpenMultipassDocumentation } from './install';
import { handleCancelPendingLaunch, handleClearPendingLaunch, handleRetryPendingLaunch } from './pending';
import { handleGetInstanceInfo, handleStopInstance, handleSuspendInstance, handleStartInstance, handleRecoverInstance, handleDeleteInstance, handlePurgeInstance } from './instance';
import { handleAddMount, handleRemoveMount } from './mounts';
import { handleGetSnapshots, handleTakeSnapshot, handleRestoreSnapshot, handleDeleteSnapshot } from './snapshots';
import { handleShellInstance, handleSetupSSHInstance, handleStartAndShellInstance, handleRecoverAndShellInstance } from './shell';
import { handleLaunchInstance, handleLaunchCustomInstance, handleLaunchInlineInstance, handleGetInlineImageOptions, handleLaunchCloudInitInstance, handleLaunchProfileInstance } from './launch';

type AnyMsg = Record<string, unknown>;
type Handler = (msg: AnyMsg, ctx: HandlerContext) => Promise<void>;

const HANDLERS: Record<string, Handler> = {
	refreshList:                  async (_m, ctx) => { await ctx.refresh(); },
	downloadMultipass:            async () => { await handleDownloadMultipass(); },
	installMultipassViaTerminal:  handleInstallViaTerminal,
	copyInstallCommand:           handleCopyInstallCommand,
	openInstallManagerHelp:       handleOpenInstallManagerHelp,
	openMultipassDocumentation:   async () => { await handleOpenMultipassDocumentation(); },
	cancelPendingLaunch:          handleCancelPendingLaunch as Handler,
	clearPendingLaunch:           handleClearPendingLaunch as Handler,
	retryPendingLaunch:           handleRetryPendingLaunch as Handler,
	getInstanceInfo:              handleGetInstanceInfo as Handler,
	openFullDiskAccessSettings:   async () => {
		if (process.platform === 'darwin') {
			vscode.env.openExternal(vscode.Uri.parse('x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles'));
		}
	},
	addMount:                     handleAddMount as Handler,
	removeMount:                  handleRemoveMount as Handler,
	getSnapshots:                 handleGetSnapshots as Handler,
	takeSnapshot:                 handleTakeSnapshot as Handler,
	restoreSnapshot:              handleRestoreSnapshot as Handler,
	deleteSnapshot:               handleDeleteSnapshot as Handler,
	stopInstance:                 handleStopInstance as Handler,
	suspendInstance:              handleSuspendInstance as Handler,
	startInstance:                handleStartInstance as Handler,
	recoverInstance:              handleRecoverInstance as Handler,
	shellInstance:                handleShellInstance as Handler,
	setupSSHInstance:             handleSetupSSHInstance as Handler,
	startAndShellInstance:        handleStartAndShellInstance as Handler,
	recoverAndShellInstance:      handleRecoverAndShellInstance as Handler,
	launchInstance:               handleLaunchInstance,
	launchCustomInstance:         handleLaunchCustomInstance,
	launchInlineInstance:         handleLaunchInlineInstance as Handler,
	getInlineImageOptions:        handleGetInlineImageOptions as Handler,
	launchCloudInitInstance:      handleLaunchCloudInitInstance,
	launchProfileInstance:        async () => { await handleLaunchProfileInstance(); },
	deleteInstance:               handleDeleteInstance as Handler,
	purgeInstance:                handlePurgeInstance as Handler,
};

export function createMessageDispatcher(ctx: HandlerContext) {
	return async (message: AnyMsg): Promise<void> => {
		const handler = HANDLERS[message.command as string];
		if (handler) {
			await handler(message, ctx);
		}
	};
}
