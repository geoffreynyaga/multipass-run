import * as vscode from 'vscode';

import { launchInstance } from '../commands/launch/launchInstance';
import { INLINE_LAUNCH_MAX_DURATION_MS, INLINE_LAUNCH_REFRESH_INTERVAL_MS } from '../config/timings';
import { pollInstanceStatus } from '../extension-utils/instancePolling';
import { setupSSHConnection } from '../extension-utils/sshSetup';
import { MultipassService } from '../multipassService';
import { buildImageOptions, pickImageForDistro } from '../utils/multipassImages';
import { capabilitiesFromImages } from '../utils/multipassVersion';
import type { HandlerContext, LaunchInlineConfig } from './context';

export async function handleLaunchInstance(_msg: unknown, ctx: HandlerContext): Promise<void> {
	await ctx.createDefaultInstance();
}

export async function handleLaunchCustomInstance(_msg: unknown, ctx: HandlerContext): Promise<void> {
	await ctx.createDetailedInstance();
}

export async function handleLaunchInlineInstance(msg: { config: LaunchInlineConfig }, ctx: HandlerContext): Promise<void> {
	const config = msg.config;
	const instanceName = config.name?.trim();

	if (instanceName && !/^[a-zA-Z0-9-_]+$/.test(instanceName)) {
		vscode.window.showErrorMessage('Instance name can only contain letters, numbers, hyphens, and underscores.');
		return;
	}
	if (instanceName && await MultipassService.instanceNameExists(instanceName)) {
		vscode.window.showErrorMessage(`Instance '${instanceName}' already exists. Please choose a different name.`);
		return;
	}
	if (config.distro !== 'ubuntu' && !ctx.multipassCapabilities.supportsAlternativeDistros) {
		vscode.window.showErrorMessage('Fedora and Debian images require Multipass 1.17 or newer.');
		return;
	}

	const imagesResult = await MultipassService.findImages();
	if (!imagesResult) {
		vscode.window.showErrorMessage('Failed to fetch available Multipass images.');
		return;
	}
	const selectedImage = config.image ? imagesResult.images[config.image] : undefined;
	const image = selectedImage
		? { imageKey: config.image, release: `${selectedImage.os} ${selectedImage.release}` }
		: pickImageForDistro(imagesResult.images, config.distro);
	if (!image) {
		vscode.window.showErrorMessage(`No ${config.distro} image was found in multipass find.`);
		return;
	}

	const isCustom = config.mode === 'custom';
	if (isCustom) {
		const cpuCount = parseInt(config.cpus || '', 10);
		if (isNaN(cpuCount) || cpuCount < 1) {
			vscode.window.showErrorMessage('CPU must be a positive integer.');
			return;
		}
		for (const [label, value] of [['Memory', config.memory], ['Disk', config.disk]] as const) {
			if (!value || !/^\d+(\.\d+)?[KMG]$/.test(value)) {
				vscode.window.showErrorMessage(`${label} must use a size like 2G or 512M.`);
				return;
			}
		}
	}

	if (instanceName) {
		await ctx.pendingStore.add({
			name: instanceName,
			release: image.release,
			startedAt: Date.now(),
			status: 'launching',
			config: {
				image: image.imageKey,
				cpus: isCustom ? config.cpus : undefined,
				memory: isCustom ? config.memory : undefined,
				disk: isCustom ? config.disk : undefined,
			},
		});

		const currentLists = await MultipassService.getInstanceLists();
		const isImageCached = await MultipassService.isImageAlreadyDownloaded(image.release);
		currentLists.active.push({
			name: instanceName,
			state: isImageCached ? 'Creating' : 'Downloading Image',
			ipv4: '',
			release: image.release,
		});
		ctx.postMessage({ command: 'updateInstances', instanceLists: currentLists });
	}

	const result = await vscode.window.withProgress(
		{
			location: vscode.ProgressLocation.Notification,
			title: instanceName ? `Launching ${instanceName}` : 'Launching instance',
			cancellable: false,
		},
		async (progress) => {
			const launchPromise = launchInstance({
				name: instanceName,
				image: image.imageKey,
				cpus: isCustom ? config.cpus : undefined,
				memory: isCustom ? config.memory : undefined,
				disk: isCustom ? config.disk : undefined,
				onProgress: (message) => progress.report({ message }),
			});

			// Drive refresh while launch is in flight so the row appears as soon
			// as `multipass list` registers it. Critical for unnamed launches:
			// multipass picks a random name during launch, so we have no name to
			// seed an optimistic placeholder and must discover the row via poll.
			// Self-clear past the max duration so a hung CLI can't keep polling
			// indefinitely.
			const pollStartedAt = Date.now();
			const refreshInterval = setInterval(() => {
				if (Date.now() - pollStartedAt >= INLINE_LAUNCH_MAX_DURATION_MS) {
					clearInterval(refreshInterval);
					return;
				}
				ctx.refresh().catch(() => { /* transient list errors are fine */ });
			}, INLINE_LAUNCH_REFRESH_INTERVAL_MS);

			try {
				return await launchPromise;
			} finally {
				clearInterval(refreshInterval);
			}
		}
	);

	if (result.success) {
		if (instanceName) {
			await ctx.pendingStore.remove(instanceName);
		}
		const launchedName = result.instanceName || instanceName;
		vscode.window.showInformationMessage(
			launchedName ? `Instance '${launchedName}' launched.` : 'Instance launched.'
		);
		if (launchedName) {
			pollInstanceStatus(launchedName, () => ctx.refresh());
			// Fire-and-forget: setupSSHConnection waits for the instance to
			// reach Running + have an IP, configures ~/.ssh/config, then shows
			// the Connect-now / Open-Remote-SSH modal. Same pattern used by
			// instanceCreation.ts for the Command-Palette flow.
			if (config.enableSSH) {
				setupSSHConnection(launchedName).catch((err) => {
					console.error('SSH setup failed:', err);
				});
			}
		} else {
			await ctx.refresh();
		}
	} else {
		if (instanceName) {
			await ctx.pendingStore.remove(instanceName);
		}
		vscode.window.showErrorMessage(
			instanceName
				? `Failed to launch instance '${instanceName}': ${result.error}`
				: `Failed to launch instance: ${result.error}`
		);
		await ctx.refresh();
	}
}

export async function handleGetInlineImageOptions(msg: { distro?: string }, ctx: HandlerContext): Promise<void> {
	const requestedDistro = typeof msg.distro === 'string' ? msg.distro : 'ubuntu';
	const distro = requestedDistro === 'fedora' || requestedDistro === 'debian'
		? requestedDistro
		: 'ubuntu' as const;

	let imagesResult = ctx.cachedImages;
	if (!imagesResult) {
		imagesResult = await MultipassService.findImages();
		if (imagesResult) {
			ctx.setCachedImages(imagesResult);
			ctx.setMultipassCapabilities(capabilitiesFromImages(imagesResult));
		}
	}
	if (!imagesResult) {
		ctx.postMessage({ command: 'inlineImageOptionsError', error: 'Failed to fetch available Multipass images.' });
		return;
	}
	ctx.postMessage({ command: 'inlineImageOptions', options: buildImageOptions(imagesResult.images, distro) });
}

export async function handleLaunchCloudInitInstance(_msg: unknown, ctx: HandlerContext): Promise<void> {
	await ctx.launchCloudInitFromSidebar();
}

export async function handleLaunchProfileInstance(): Promise<void> {
	vscode.window.showInformationMessage('Profile launches are coming soon.');
}
