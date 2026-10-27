import * as vscode from 'vscode';

import type { WebviewCommand, WebviewMessage } from '../shared/messages';
import type { HandlerContext } from './context';
import { handleCopyInstallCommand, handleDownloadMultipass, handleInstallViaTerminal, handleOpenInstallManagerHelp, handleOpenMultipassDocumentation } from './install';
import { handleDeleteInstance, handleGetInstanceInfo, handlePurgeInstance,handleRecoverInstance, handleStartInstance, handleStopInstance, handleSuspendInstance } from './instance';
import { handleGetInlineImageOptions, handleLaunchCloudInitInstance, handleLaunchCustomInstance, handleLaunchInlineInstance, handleLaunchInstance, handleLaunchProfileInstance } from './launch';
import { handleAddMount, handleRemoveMount } from './mounts';
import { handleCancelPendingLaunch, handleClearPendingLaunch, handleRetryPendingLaunch } from './pending';
import { handleRecoverAndShellInstance,handleSetupSSHInstance, handleShellInstance, handleStartAndShellInstance } from './shell';
import { handleDeleteSnapshot,handleGetSnapshots, handleRestoreSnapshot, handleTakeSnapshot } from './snapshots';

type Handler<M> = (msg: M, ctx: HandlerContext) => Promise<void>;

// One entry per command; a missing or misspelled command fails to compile.
const HANDLERS: { [C in WebviewCommand]: Handler<Extract<WebviewMessage, { command: C }>> } = {
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
	return async (message: WebviewMessage): Promise<void> => {
		const handler = HANDLERS[message.command] as Handler<WebviewMessage> | undefined;
		if (!handler) {
			console.warn('Unknown webview command:', message.command);
			return;
		}
		await handler(message, ctx);
	};
}
