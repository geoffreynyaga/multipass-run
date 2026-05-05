import React from 'react';
import type { InstallPlan } from '../../utils/installPackageManager';
import { VmIcon, ShellIcon, CopyIcon, ExternalLinkIcon } from './Icons';

// ── Install screen sub-components ──────────────────────────────────────────

const InstallActionButton: React.FC<{
	children: React.ReactNode;
	onClick: () => void;
	variant?: 'primary' | 'secondary' | 'ghost';
	title?: string;
	style?: React.CSSProperties;
}> = ({ children, onClick, variant = 'secondary', title, style }) => {
	const base: React.CSSProperties = {
		border: variant === 'ghost' ? 'none' : '1px solid var(--vscode-button-border, rgba(255,255,255,0.08))',
		borderRadius: '3px',
		cursor: 'pointer',
		fontFamily: 'Ubuntu, system-ui, -apple-system, sans-serif',
		fontSize: variant === 'ghost' ? '11.5px' : '12px',
		fontWeight: 600,
		display: 'inline-flex',
		alignItems: 'center',
		justifyContent: 'center',
		gap: '7px',
		minHeight: variant === 'ghost' ? '30px' : '34px',
		color: variant === 'primary' ? '#ffffff' : 'var(--vscode-foreground)',
		background: variant === 'primary'
			? '#E95420'
			: variant === 'ghost'
				? 'transparent'
				: 'var(--vscode-button-secondaryBackground, rgba(255,255,255,0.04))',
		padding: variant === 'ghost' ? '7px 8px' : '8px 12px',
		...style,
	};

	return (
		<button
			type="button"
			title={title}
			onClick={onClick}
			style={base}
			onMouseEnter={(e) => {
				e.currentTarget.style.background = variant === 'primary'
					? '#C7401A'
					: variant === 'ghost'
						? 'rgba(255,255,255,0.04)'
						: 'var(--vscode-button-secondaryHoverBackground, rgba(255,255,255,0.08))';
			}}
			onMouseLeave={(e) => {
				e.currentTarget.style.background = String(base.background);
			}}
		>
			{children}
		</button>
	);
};

const InstallCard: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
	<div
		style={{
			background: 'rgba(255,255,255,0.025)',
			border: '1px solid rgba(255,255,255,0.055)',
			borderRadius: '6px',
			padding: '16px 14px',
			...style
		}}
	>
		{children}
	</div>
);

const InstallEyebrow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
	<div
		style={{
			marginBottom: '11px',
			fontSize: '10.5px',
			letterSpacing: '0.14em',
			lineHeight: 1.35,
			textTransform: 'uppercase',
			color: 'var(--vscode-descriptionForeground)',
			fontWeight: 700
		}}
	>
		{children}
	</div>
);

const CommandBlock: React.FC<{ command: string }> = ({ command }) => (
	<div
		style={{
			padding: '10px 12px',
			background: '#0A0D11',
			borderRadius: '3px',
			fontSize: '11.5px',
			color: 'var(--vscode-foreground)',
			marginBottom: '12px',
			wordBreak: 'break-all',
			fontFamily: '"JetBrains Mono", "SF Mono", Menlo, Consolas, monospace',
			lineHeight: 1.45
		}}
	>
		{command}
	</div>
);

// ── Install-missing screen ─────────────────────────────────────────────────

export const InstallMissingScreen: React.FC<{
	plan: InstallPlan | null;
	onDownloadMultipass: () => void;
	onInstallViaTerminal: () => void;
	onCopyInstallCommand: () => void;
	onOpenManagerHelp: () => void;
	onOpenDocs: () => void;
	onRefreshList: () => void;
}> = ({
	plan,
	onDownloadMultipass,
	onInstallViaTerminal,
	onCopyInstallCommand,
	onOpenManagerHelp,
	onOpenDocs,
	onRefreshList
}) => {
	const platformLabel = plan?.platformLabel ?? 'this system';
	const managerLabel = plan?.managerLabel ?? (
		plan?.platform === 'darwin' ? 'Homebrew' :
			plan?.platform === 'win32' ? 'winget' :
				null
	);
	const hasTerminalInstall = Boolean(plan?.command && plan.managerLabel);
	const isWindowsOfficialFirst = Boolean(plan?.preferOfficialInstaller && hasTerminalInstall);
	const canShowManagerHelp = Boolean(plan?.managerHelpUrl && managerLabel);

	const summary = hasTerminalInstall
		? `Detected ${platformLabel} - ${managerLabel} available`
		: `Detected ${platformLabel}`;

	React.useEffect(() => {
		const intervalId = window.setInterval(onRefreshList, 3000);
		return () => window.clearInterval(intervalId);
	}, [onRefreshList]);

	return (
		<div
			style={{
			minHeight: '100vh',
				padding: '28px 20px 18px',
				display: 'flex',
				flexDirection: 'column',
				fontFamily: 'Ubuntu, system-ui, -apple-system, sans-serif',
				boxSizing: 'border-box'
			}}
		>
			<div style={{ width: '100%', maxWidth: '286px', margin: '0 auto' }}>
			<div style={{ textAlign: 'center', marginBottom: '20px' }}>
				<div
					style={{
						width: '64px',
						height: '64px',
						borderRadius: '50%',
						background: 'rgba(233,84,32,0.08)',
						border: '1px solid rgba(233,84,32,0.30)',
						display: 'inline-flex',
						alignItems: 'center',
						justifyContent: 'center',
						color: '#E95420'
					}}
				>
					<VmIcon />
				</div>
				<div style={{ color: 'var(--vscode-foreground)', fontSize: '16px', marginTop: '13px', fontWeight: 600, lineHeight: 1.3 }}>
					Multipass not installed
				</div>
				<div style={{ color: 'var(--vscode-descriptionForeground)', fontSize: '12px', marginTop: '3px', lineHeight: 1.45 }}>
					{summary}
				</div>
			</div>

			{isWindowsOfficialFirst && plan?.command ? (
				<>
					<InstallCard style={{ marginBottom: '12px' }}>
						<InstallEyebrow>Recommended - official installer</InstallEyebrow>
						<div style={{ fontSize: '11.5px', color: 'var(--vscode-descriptionForeground)', lineHeight: 1.5, marginBottom: '11px' }}>
							Signed <span style={{ color: 'var(--vscode-foreground)', fontFamily: '"JetBrains Mono", monospace' }}>.exe</span> from canonical.com - the canonical path on Windows.
						</div>
							<InstallActionButton onClick={onDownloadMultipass} variant="primary" style={{ width: '100%', marginTop: '3px' }}>
							Open download page
						</InstallActionButton>
					</InstallCard>
					<InstallCard>
						<InstallEyebrow>Or - {plan.managerLabel}</InstallEyebrow>
						<CommandBlock command={plan.command} />
						<div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
							<InstallActionButton onClick={onInstallViaTerminal} style={{ flex: 1 }}>
								<ShellIcon /> Run in Terminal
							</InstallActionButton>
							<InstallActionButton onClick={onCopyInstallCommand} title="Copy command" style={{ flex: '0 0 38px', padding: '8px 9px' }}>
								<CopyIcon />
							</InstallActionButton>
						</div>
					</InstallCard>
				</>
			) : hasTerminalInstall && plan?.command ? (
				<>
					<InstallCard>
						<InstallEyebrow>Recommended - {plan.managerLabel}</InstallEyebrow>
						<CommandBlock command={plan.command} />
						<div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
							<InstallActionButton onClick={onInstallViaTerminal} variant="primary" style={{ flex: 1 }}>
								<ShellIcon /> Run in Terminal
							</InstallActionButton>
							<InstallActionButton onClick={onCopyInstallCommand} title="Copy command" style={{ flex: '0 0 38px', padding: '8px 9px' }}>
								<CopyIcon />
							</InstallActionButton>
						</div>
						<div style={{ fontSize: '10.5px', color: 'var(--vscode-descriptionForeground)', opacity: 0.72, marginTop: '13px', lineHeight: 1.45 }}>
							Opens VS Code's terminal with the command pre-typed. You press Enter.
						</div>
					</InstallCard>
					<div style={{ marginTop: '14px' }}>
						<InstallActionButton onClick={onDownloadMultipass} variant="ghost" style={{ width: '100%' }}>
							Open download page instead
						</InstallActionButton>
					</div>
				</>
			) : (
				<>
					<InstallCard style={{ marginBottom: '12px' }}>
						<InstallEyebrow>{managerLabel ? `${managerLabel} not found` : 'Package manager not found'}</InstallEyebrow>
						<div style={{ fontSize: '11.5px', color: 'var(--vscode-descriptionForeground)', lineHeight: 1.5 }}>
							Falling back to the official installer.
						</div>
					</InstallCard>
					<InstallActionButton onClick={onDownloadMultipass} variant="primary" style={{ width: '100%', padding: '9px' }}>
						Open download page
					</InstallActionButton>
					{canShowManagerHelp && (
						<div style={{ marginTop: '12px' }}>
							<InstallActionButton onClick={onOpenManagerHelp} variant="ghost" style={{ width: '100%' }}>
								How to install {managerLabel}
							</InstallActionButton>
						</div>
					)}
				</>
			)}

			<div
				style={{
					marginTop: '24px',
					padding: '11px 0 0',
					borderTop: '1px solid rgba(255,255,255,0.07)',
					fontSize: '10.5px',
					color: 'var(--vscode-descriptionForeground)',
					opacity: 0.72,
					lineHeight: 1.5,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					gap: '10px'
				}}
			>
				<span>Re-checks every 3 s.</span>
				<button
					type="button"
					onClick={onOpenDocs}
					style={{
						border: 'none',
						background: 'transparent',
						color: '#E95420',
						fontSize: '11px',
						fontFamily: 'Ubuntu, system-ui, -apple-system, sans-serif',
						display: 'inline-flex',
						alignItems: 'center',
						gap: '4px',
						padding: 0,
						cursor: 'pointer',
						whiteSpace: 'nowrap'
					}}
				>
					Documentation <ExternalLinkIcon size={10} />
				</button>
			</div>
			</div>
		</div>
	);
};
