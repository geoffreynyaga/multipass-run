import type * as vscode from 'vscode';

import type { PendingLaunchStore } from '../extension-utils/pendingLaunches';
import type { TerminalManager } from '../extension-utils/terminalManager';
import type { ExtensionMessage } from '../shared/messages';
import type { InstallPlan } from '../utils/installPackageManager';
import type { FindImagesResult } from '../utils/multipassImages';
import type { MultipassCapabilities, MultipassEnvironment } from '../utils/multipassVersion';

export interface HandlerContext {
	readonly view: vscode.WebviewView;
	readonly pendingStore: PendingLaunchStore;
	readonly terminalManager: TerminalManager;
	readonly installPlan: InstallPlan | null;
	readonly cachedImages: FindImagesResult | null;
	readonly multipassCapabilities: MultipassCapabilities;
	postMessage(message: ExtensionMessage): void;
	setCachedImages(images: FindImagesResult | null): void;
	setMultipassCapabilities(caps: MultipassCapabilities): void;
	refresh(): Promise<void>;
	inspectEnvironment(): Promise<MultipassEnvironment>;
	createDefaultInstance(): Promise<void>;
	createDetailedInstance(): Promise<void>;
	launchCloudInitFromSidebar(): Promise<void>;
	maybeOfferKeyRemovalPrompt(): Promise<void>;
}
