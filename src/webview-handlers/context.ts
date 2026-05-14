import type * as vscode from 'vscode';

import type { PendingLaunchStore } from '../extension-utils/pendingLaunches';
import type { TerminalManager } from '../extension-utils/terminalManager';
import type { InstallPlan } from '../utils/installPackageManager';
import type { FindImagesResult, MultipassDistro } from '../utils/multipassImages';
import type { MultipassCapabilities } from '../utils/multipassVersion';

export interface LaunchInlineConfig {
	mode: 'quick' | 'custom';
	name?: string;
	distro: MultipassDistro;
	image?: string;
	imageRelease?: string;
	cpus?: string;
	memory?: string;
	disk?: string;
}

export interface HandlerContext {
	readonly view: vscode.WebviewView;
	readonly pendingStore: PendingLaunchStore;
	readonly terminalManager: TerminalManager;
	readonly installPlan: InstallPlan | null;
	readonly cachedImages: FindImagesResult | null;
	readonly multipassCapabilities: MultipassCapabilities;
	postMessage(message: Record<string, unknown>): void;
	setCachedImages(images: FindImagesResult | null): void;
	setMultipassCapabilities(caps: MultipassCapabilities): void;
	refresh(): Promise<void>;
	createDefaultInstance(): Promise<void>;
	createDetailedInstance(): Promise<void>;
	launchCloudInitFromSidebar(): Promise<void>;
	maybeOfferKeyRemovalPrompt(): Promise<void>;
}
