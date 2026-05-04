import { InstanceLists, MultipassInstanceInfo } from '../multipassService';
import React, { useEffect, useState } from 'react';
import type { InstallPlan } from '../utils/installPackageManager';
import type { MultipassCapabilities } from '../utils/multipassVersion';
import type { MultipassDistro, MultipassImageOption } from '../utils/multipassImages';

import  InstanceList from './components/InstanceList';

declare const acquireVsCodeApi: () => any;
declare global {
	interface Window {
		initialState?: InstanceLists;
		multipassCapabilities?: MultipassCapabilities;
		ubuntuIconUri?: string;
		ubuntuDarkIconUri?: string;
		fedoraIconUri?: string;
		fedoraDarkIconUri?: string;
		debianIconUri?: string;
		debianDarkIconUri?: string;
		extensionIconUri?: string;
		installPlan?: InstallPlan | null;
	}
}

const vscode = acquireVsCodeApi();

export interface InlineLaunchConfig {
	mode: 'quick' | 'custom';
	name?: string;
	distro: MultipassDistro;
	image?: string;
	imageRelease?: string;
	cpus?: string;
	memory?: string;
	disk?: string;
}

export type InlineImageOption = MultipassImageOption;

const VmIcon: React.FC<{ size?: number }> = ({ size = 28 }) => (
	<svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
		<rect x="2" y="3" width="12" height="8" rx="1" />
		<path d="M5 14h6M8 11v3" />
	</svg>
);

const ShellIcon: React.FC<{ size?: number }> = ({ size = 12 }) => (
	<svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
		<path d="M3 5l3 3-3 3M8 12h5" />
	</svg>
);

const CopyIcon: React.FC<{ size?: number }> = ({ size = 12 }) => (
	<svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
		<rect x="5" y="5" width="9" height="9" rx="1.2" />
		<path d="M3 11V3a1 1 0 0 1 1-1h7" />
	</svg>
);

const ExternalLinkIcon: React.FC<{ size?: number }> = ({ size = 12 }) => (
	<svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
		<path d="M6 4H3.5A1.5 1.5 0 0 0 2 5.5v7A1.5 1.5 0 0 0 3.5 14h7a1.5 1.5 0 0 0 1.5-1.5V10" />
		<path d="M9 2h5v5M8 8l6-6" />
	</svg>
);

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

const InstallMissingScreen: React.FC<{
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

const App: React.FC = () => {
	const [instanceLists, setInstanceLists] = useState<InstanceLists>(
		window.initialState || { active: [], deleted: [] }
	);
	const [instanceInfo, setInstanceInfo] = useState<MultipassInstanceInfo | null>(null);
	const [multipassCapabilities, setMultipassCapabilities] = useState<MultipassCapabilities>(
		window.multipassCapabilities || { supportsAlternativeDistros: false }
	);
	const [installPlan, setInstallPlan] = useState<InstallPlan | null>(window.installPlan || null);
	const [inlineImageOptions, setInlineImageOptions] = useState<InlineImageOption[]>([]);
	const [isLoadingInlineImages, setIsLoadingInlineImages] = useState(false);

	// Debug: Log initial state
	console.log('App mounted. Initial state:', window.initialState);
	console.log('Instance lists:', instanceLists);

	// Check error states
	const isMultipassNotInstalled = instanceLists.error?.type === 'not-installed';
	const isDaemonNotRunning = instanceLists.error?.type === 'daemon-not-running';

	useEffect(() => {
		// Listen for messages from the extension
		const handleMessage = (event: MessageEvent) => {
			const message = event.data;
			console.log('Message received:', message);

			switch (message.command) {
				case 'updateInstances':
					setInstanceLists(message.instanceLists);
					break;
				case 'instanceInfo':
					setInstanceInfo(message.info);
					break;
				case 'multipassCapabilities':
					setMultipassCapabilities(message.capabilities);
					break;
				case 'installPlan':
					setInstallPlan(message.plan);
					break;
				case 'inlineImageOptions':
					setInlineImageOptions(message.options || []);
					setIsLoadingInlineImages(false);
					break;
				case 'inlineImageOptionsError':
					setInlineImageOptions([]);
					setIsLoadingInlineImages(false);
					break;
			}
		};

		window.addEventListener('message', handleMessage);

		return () => {
			window.removeEventListener('message', handleMessage);
		};
	}, []);

	const handleCreateInstance = () => {
		vscode.postMessage({ command: 'launchInstance' });
	};

	const handleCreateCustomInstance = () => {
		vscode.postMessage({ command: 'launchCustomInstance' });
	};

	const handleCreateCloudInitInstance = () => {
		vscode.postMessage({ command: 'launchCloudInitInstance' });
	};

	const handleCreateProfileInstance = () => {
		vscode.postMessage({ command: 'launchProfileInstance' });
	};

	const handleLaunchFromInlineForm = (config: InlineLaunchConfig) => {
		vscode.postMessage({ command: 'launchInlineInstance', config });
	};

	const handleRequestInlineImages = React.useCallback((distro: InlineLaunchConfig['distro']) => {
		setIsLoadingInlineImages(true);
		vscode.postMessage({ command: 'getInlineImageOptions', distro });
	}, []);

	const handleStartInstance = (name: string) => {
		vscode.postMessage({ command: 'startInstance', instanceName: name });
	};

	const handleStopInstance = (name: string) => {
		vscode.postMessage({ command: 'stopInstance', instanceName: name });
	};

	const handleSuspendInstance = (name: string) => {
		vscode.postMessage({ command: 'suspendInstance', instanceName: name });
	};

	const handleShellInstance = (name: string) => {
		vscode.postMessage({ command: 'shellInstance', instanceName: name });
	};

	const handleSetupSSHInstance = (name: string) => {
		vscode.postMessage({ command: 'setupSSHInstance', instanceName: name });
	};

	const handleStartAndShellInstance = (name: string) => {
		vscode.postMessage({ command: 'startAndShellInstance', instanceName: name });
	};

	const handleRecoverAndShellInstance = (name: string) => {
		vscode.postMessage({ command: 'recoverAndShellInstance', instanceName: name });
	};

	const handleDeleteInstance = (name: string) => {
		console.log('handleDeleteInstance called for:', name);
		vscode.postMessage({ command: 'deleteInstance', instanceName: name });
		console.log('deleteInstance message sent to extension');
	};

	const handleRecoverInstance = (name: string) => {
		vscode.postMessage({ command: 'recoverInstance', instanceName: name });
	};

	const handlePurgeInstance = (name: string) => {
		vscode.postMessage({ command: 'purgeInstance', instanceName: name });
	};

	const handleGetInstanceInfo = (name: string) => {
		vscode.postMessage({ command: 'getInstanceInfo', instanceName: name });
	};

	const handleRefreshList = () => {
		vscode.postMessage({ command: 'refreshList' });
	};

	const handleClearPendingLaunch = (name: string) => {
		vscode.postMessage({ command: 'clearPendingLaunch', instanceName: name });
	};

	const handleDownloadMultipass = () => {
		vscode.postMessage({ command: 'downloadMultipass' });
	};

	const handleInstallViaTerminal = () => {
		vscode.postMessage({ command: 'installMultipassViaTerminal' });
	};

	const handleCopyInstallCommand = () => {
		vscode.postMessage({ command: 'copyInstallCommand' });
	};

	const handleOpenManagerHelp = () => {
		vscode.postMessage({ command: 'openInstallManagerHelp' });
	};

	const handleOpenDocs = () => {
		vscode.postMessage({ command: 'openMultipassDocumentation' });
	};

	// If daemon is not running, show error message
	if (isDaemonNotRunning) {
		return (
			<div
				className="flex flex-col items-center justify-evenly min-h-[300px] px-6 py-12"
				style={{ fontFamily: 'Ubuntu, system-ui, -apple-system, sans-serif' }}
			>
				{/* Icon - Warning icon in Ubuntu Orange */}
				<div className="mb-6">
					<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
						<circle cx="24" cy="24" r="20" stroke="#E95420" strokeWidth="2" fill="none"/>
						<path d="M18 18L30 30M30 18L18 30" stroke="#E95420" strokeWidth="2" strokeLinecap="round"/>
					</svg>
				</div>

				{/* Title */}
				<h2
					className="mb-3 text-xl font-light"
					style={{
						color: 'var(--vscode-foreground)',
						fontFamily: 'Ubuntu, system-ui, -apple-system, sans-serif'
					}}
				>
					Multipass Daemon Not Running
				</h2>

				{/* Description */}
				<p
					className="max-w-md mb-8 text-sm leading-relaxed text-center"
					style={{ color: 'var(--vscode-descriptionForeground)' }}
				>
					Multipass is installed but the daemon is not running. Please start Multipass from your Applications folder or system tray.
				</p>

				{/* Actions */}
				<div className="flex flex-col w-full max-w-xs" style={{ gap: '12px' }}>
					<button
						onClick={handleRefreshList}
						className="w-full bg-[#E95420] text-white text-sm font-normal rounded-sm hover:bg-[#C73E1A] transition-colors"
						style={{
							padding: '10px 24px'
						}}
					>
						Refresh
					</button>
				</div>
			</div>
		);
	}

	// If multipass is not installed, show error message with download options
	if (isMultipassNotInstalled) {
		return (
			<InstallMissingScreen
				plan={installPlan}
				onDownloadMultipass={handleDownloadMultipass}
				onInstallViaTerminal={handleInstallViaTerminal}
				onCopyInstallCommand={handleCopyInstallCommand}
				onOpenManagerHelp={handleOpenManagerHelp}
				onOpenDocs={handleOpenDocs}
				onRefreshList={handleRefreshList}
			/>
		);
	}

	return (
		<InstanceList
			instanceLists={instanceLists}
			instanceInfo={instanceInfo}
			ubuntuIconUri={window.ubuntuIconUri || ''}
			ubuntuDarkIconUri={window.ubuntuDarkIconUri || ''}
			fedoraIconUri={window.fedoraIconUri || ''}
			fedoraDarkIconUri={window.fedoraDarkIconUri || ''}
			debianIconUri={window.debianIconUri || ''}
			debianDarkIconUri={window.debianDarkIconUri || ''}
			onCreateInstance={handleCreateInstance}
			onCreateCustomInstance={handleCreateCustomInstance}
			onCreateCloudInitInstance={handleCreateCloudInitInstance}
			onCreateProfileInstance={handleCreateProfileInstance}
			onLaunchFromInlineForm={handleLaunchFromInlineForm}
			inlineImageOptions={inlineImageOptions}
			isLoadingInlineImages={isLoadingInlineImages}
			onRequestInlineImages={handleRequestInlineImages}
			multipassCapabilities={multipassCapabilities}
			onStartInstance={handleStartInstance}
			onStopInstance={handleStopInstance}
			onSuspendInstance={handleSuspendInstance}
			onShellInstance={handleShellInstance}
			onSetupSSHInstance={handleSetupSSHInstance}
			onStartAndShellInstance={handleStartAndShellInstance}
			onRecoverAndShellInstance={handleRecoverAndShellInstance}
			onDeleteInstance={handleDeleteInstance}
			onRecoverInstance={handleRecoverInstance}
			onPurgeInstance={handlePurgeInstance}
			onGetInstanceInfo={handleGetInstanceInfo}
			onRefreshList={handleRefreshList}
			onClearPendingLaunch={handleClearPendingLaunch}
		/>
	);
};

export default App;
