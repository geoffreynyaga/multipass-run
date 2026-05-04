import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export type PackageManager = 'brew' | 'snap' | 'apt' | 'dnf' | 'pacman' | 'winget';

export interface InstallPlan {
	platform: NodeJS.Platform;
	platformLabel: string;
	manager: PackageManager | null;
	managerLabel: string | null;
	command: string | null;
	downloadUrl: string;
	managerHelpUrl: string | null;
	/**
	 * When true, the official installer should be the primary CTA even when
	 * a package manager is detected. Set on Windows because the signed .exe
	 * is the canonical install path; the package-manager command is shown
	 * as an "OR" alternative beneath it.
	 */
	preferOfficialInstaller: boolean;
	notes?: string;
}

export const MULTIPASS_DOWNLOAD_URL =
	'https://documentation.ubuntu.com/multipass/latest/how-to-guides/install-multipass/';

const COMMANDS: Record<PackageManager, string> = {
	brew: 'brew install --cask multipass',
	snap: 'sudo snap install multipass',
	apt: 'sudo apt update && sudo apt install -y multipass',
	dnf: 'sudo dnf install -y multipass',
	pacman: 'yay -S multipass',
	winget: 'winget install Canonical.Multipass',
};

const MANAGER_LABELS: Record<PackageManager, string> = {
	brew: 'Homebrew',
	snap: 'snap',
	apt: 'apt',
	dnf: 'dnf',
	pacman: 'pacman',
	winget: 'winget',
};

const MANAGER_HELP_URL: Partial<Record<PackageManager, string>> = {
	brew: 'https://brew.sh',
	winget: 'https://learn.microsoft.com/en-us/windows/package-manager/winget/',
};

const NOTES: Partial<Record<PackageManager, string>> = {
	apt: 'Multipass on apt is community-packaged and may lag behind the snap release.',
	dnf: 'Multipass on dnf is community-packaged.',
	pacman: 'Multipass on Arch is in the AUR.',
};

const PLATFORM_LABELS: Partial<Record<NodeJS.Platform, string>> = {
	darwin: 'macOS',
	linux: 'Linux',
	win32: 'Windows',
};

const PRIORITY: Partial<Record<NodeJS.Platform, PackageManager[]>> = {
	darwin: ['brew'],
	linux: ['snap', 'apt', 'dnf', 'pacman'],
	win32: ['winget'],
};

function platformLabel(p: NodeJS.Platform): string {
	return PLATFORM_LABELS[p] ?? p;
}

function fallbackManager(platform: NodeJS.Platform): PackageManager | null {
	const candidates = PRIORITY[platform];
	return candidates && candidates.length > 0 ? candidates[0] : null;
}

/**
 * Pure builder. Picks the highest-priority package manager that the caller
 * has confirmed is available on the host. Falls back to a download-page-only
 * plan when nothing matches.
 */
export function buildInstallPlan(
	platform: NodeJS.Platform,
	isAvailable: (manager: PackageManager) => boolean
): InstallPlan {
	const candidates = PRIORITY[platform] ?? [];
	const preferOfficialInstaller = platform === 'win32';

	for (const pm of candidates) {
		if (isAvailable(pm)) {
			return {
				platform,
				platformLabel: platformLabel(platform),
				manager: pm,
				managerLabel: MANAGER_LABELS[pm],
				command: COMMANDS[pm],
				downloadUrl: MULTIPASS_DOWNLOAD_URL,
				managerHelpUrl: MANAGER_HELP_URL[pm] ?? null,
				preferOfficialInstaller,
				notes: NOTES[pm],
			};
		}
	}
	const fb = fallbackManager(platform);
	return {
		platform,
		platformLabel: platformLabel(platform),
		manager: null,
		managerLabel: null,
		command: null,
		downloadUrl: MULTIPASS_DOWNLOAD_URL,
		managerHelpUrl: fb ? MANAGER_HELP_URL[fb] ?? null : null,
		preferOfficialInstaller,
	};
}

async function isOnPath(manager: PackageManager, platform: NodeJS.Platform): Promise<boolean> {
	if (platform === 'win32') {
		try {
			await execAsync(`where ${manager}`);
			return true;
		} catch {
			return false;
		}
	}
	for (const shellCmd of [
		`/bin/zsh -lc 'command -v ${manager}'`,
		`/bin/bash -lc 'command -v ${manager}'`,
		`/bin/sh -c 'command -v ${manager}'`,
	]) {
		try {
			const { stdout } = await execAsync(shellCmd);
			if (stdout.trim() !== '') {
				return true;
			}
		} catch {
			continue;
		}
	}
	return false;
}

/**
 * Async detector used by the extension. Walks the platform's priority list
 * and returns the first install plan where the package manager is on PATH.
 */
export async function detectInstallPlan(): Promise<InstallPlan> {
	const platform = process.platform;
	const candidates = PRIORITY[platform] ?? [];
	const availability = new Map<PackageManager, boolean>();
	for (const pm of candidates) {
		availability.set(pm, await isOnPath(pm, platform));
	}
	return buildInstallPlan(platform, (pm) => availability.get(pm) ?? false);
}
