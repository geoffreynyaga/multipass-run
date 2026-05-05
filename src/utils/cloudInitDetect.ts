import * as vscode from 'vscode';

const CLOUD_INIT_KEYS = new Set([
	'users', 'runcmd', 'bootcmd', 'write_files', 'package_update',
	'apt', 'ssh_authorized_keys', 'chpasswd', 'packages', 'snap',
	'ca-certs', 'ntp', 'timezone', 'locale', 'hostname',
	'manage_etc_hosts', 'network', 'power_state', 'resize_rootfs',
	'cloud_final_modules', 'cloud_init_modules', 'cloud_config_modules',
]);

export async function isCloudInitFile(uri: vscode.Uri): Promise<boolean> {
	try {
		const bytes = await vscode.workspace.fs.readFile(uri);
		const text = new TextDecoder().decode(bytes.slice(0, 4096));

		// Strict: first non-blank line is #cloud-config
		const firstNonBlank = text.split('\n').find(l => l.trim().length > 0);
		if (firstNonBlank?.trim() === '#cloud-config') {
			return true;
		}

		// Loose: has known cloud-init top-level keys
		const topLevelKeys = text
			.split('\n')
			.filter(l => /^[a-z_]+:/.test(l))
			.map(l => l.split(':')[0].trim());
		return topLevelKeys.some(k => CLOUD_INIT_KEYS.has(k));
	} catch {
		return false;
	}
}
