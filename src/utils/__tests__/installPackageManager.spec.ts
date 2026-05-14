import {
	buildInstallPlan,
	MULTIPASS_DOWNLOAD_URL,
	type PackageManager,
} from '../installPackageManager';

const available = (...present: PackageManager[]) => {
	const set = new Set(present);
	return (pm: PackageManager) => set.has(pm);
};

describe('buildInstallPlan — macOS', () => {
	test('brew present returns brew terminal plan', () => {
		const plan = buildInstallPlan('darwin', available('brew'));
		expect(plan.manager).toBe('brew');
		expect(plan.managerLabel).toBe('Homebrew');
		expect(plan.command).toBe('brew install --cask multipass');
		expect(plan.platformLabel).toBe('macOS');
		expect(plan.preferOfficialInstaller).toBe(false);
		expect(plan.managerHelpUrl).toBe('https://brew.sh');
		expect(plan.downloadUrl).toBe(MULTIPASS_DOWNLOAD_URL);
	});

	test('brew missing returns download-only plan with brew help link', () => {
		const plan = buildInstallPlan('darwin', available());
		expect(plan.manager).toBeNull();
		expect(plan.managerLabel).toBeNull();
		expect(plan.command).toBeNull();
		expect(plan.platformLabel).toBe('macOS');
		expect(plan.preferOfficialInstaller).toBe(false);
		// fallback help url is set so the UI can render "How to install Homebrew"
		expect(plan.managerHelpUrl).toBe('https://brew.sh');
	});

	test('non-brew managers are ignored on darwin', () => {
		const plan = buildInstallPlan('darwin', available('snap', 'apt'));
		expect(plan.manager).toBeNull();
	});
});

describe('buildInstallPlan — Linux', () => {
	test('snap is preferred over apt/dnf/pacman', () => {
		const plan = buildInstallPlan('linux', available('snap', 'apt', 'dnf', 'pacman'));
		expect(plan.manager).toBe('snap');
		expect(plan.managerLabel).toBe('snap');
		expect(plan.command).toBe('sudo snap install multipass');
		expect(plan.platformLabel).toBe('Linux');
		expect(plan.preferOfficialInstaller).toBe(false);
	});

	test('apt is picked when snap absent', () => {
		const plan = buildInstallPlan('linux', available('apt', 'dnf'));
		expect(plan.manager).toBe('apt');
		expect(plan.command).toContain('sudo apt');
		expect(plan.notes).toBeDefined();
	});

	test('dnf is picked when only dnf available', () => {
		const plan = buildInstallPlan('linux', available('dnf'));
		expect(plan.manager).toBe('dnf');
		expect(plan.command).toContain('sudo dnf install');
	});

	test('pacman falls back to AUR command', () => {
		const plan = buildInstallPlan('linux', available('pacman'));
		expect(plan.manager).toBe('pacman');
		expect(plan.command).toBe('yay -S multipass');
	});

	test('no managers returns download-only plan', () => {
		const plan = buildInstallPlan('linux', available());
		expect(plan.manager).toBeNull();
		expect(plan.command).toBeNull();
		expect(plan.platformLabel).toBe('Linux');
		expect(plan.managerHelpUrl).toBeNull();
	});
});

describe('buildInstallPlan — Windows', () => {
	test('winget present returns plan with preferOfficialInstaller=true and command set for OR section', () => {
		const plan = buildInstallPlan('win32', available('winget'));
		expect(plan.manager).toBe('winget');
		expect(plan.managerLabel).toBe('winget');
		expect(plan.command).toBe('winget install Canonical.Multipass');
		expect(plan.platformLabel).toBe('Windows');
		expect(plan.preferOfficialInstaller).toBe(true);
	});

	test('no winget returns download-only plan with preferOfficialInstaller=true', () => {
		const plan = buildInstallPlan('win32', available());
		expect(plan.manager).toBeNull();
		expect(plan.command).toBeNull();
		expect(plan.preferOfficialInstaller).toBe(true);
	});

	test('non-winget managers are ignored on win32', () => {
		const plan = buildInstallPlan('win32', available('brew', 'snap'));
		expect(plan.manager).toBeNull();
	});
});

describe('buildInstallPlan — unknown platform', () => {
	test('returns download-only plan and platform value', () => {
		const plan = buildInstallPlan('freebsd' as NodeJS.Platform, available('snap'));
		expect(plan.platform).toBe('freebsd');
		expect(plan.platformLabel).toBe('freebsd');
		expect(plan.manager).toBeNull();
		expect(plan.preferOfficialInstaller).toBe(false);
		expect(plan.downloadUrl).toBe(MULTIPASS_DOWNLOAD_URL);
	});
});

describe('buildInstallPlan — invariants', () => {
	test('downloadUrl is always populated', () => {
		const plan = buildInstallPlan('linux', available());
		expect(plan.downloadUrl).toMatch(/^https:\/\//);
	});

	test('command and manager are both null or both populated', () => {
		const platforms: NodeJS.Platform[] = ['darwin', 'linux', 'win32'];
		const seeds: PackageManager[][] = [[], ['brew'], ['snap'], ['apt'], ['dnf'], ['winget']];
		for (const p of platforms) {
			for (const s of seeds) {
				const plan = buildInstallPlan(p, available(...s));
				if (plan.manager === null) {
					expect(plan.command).toBeNull();
					expect(plan.managerLabel).toBeNull();
				} else {
					expect(plan.command).not.toBeNull();
					expect(plan.managerLabel).not.toBeNull();
				}
			}
		}
	});

	test('preferOfficialInstaller is true iff platform is win32', () => {
		expect(buildInstallPlan('darwin', available('brew')).preferOfficialInstaller).toBe(false);
		expect(buildInstallPlan('linux', available('snap')).preferOfficialInstaller).toBe(false);
		expect(buildInstallPlan('win32', available('winget')).preferOfficialInstaller).toBe(true);
		expect(buildInstallPlan('win32', available()).preferOfficialInstaller).toBe(true);
	});
});
