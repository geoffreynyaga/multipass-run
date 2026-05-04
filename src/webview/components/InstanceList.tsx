import { InstanceLists, MultipassInstanceInfo } from '../../multipassService';
import { getDistributionFont, getMonoFont } from '../utils/fontUtils';

import { InstanceDetails } from './InstanceDetails';
import { MAX_VM_NAME_DISPLAY_CHARS } from '../../utils/constants';
import React from 'react';

interface InstanceListProps {
	instanceLists: InstanceLists;
	instanceInfo: MultipassInstanceInfo | null;
	ubuntuIconUri: string;
	ubuntuDarkIconUri: string;
	fedoraIconUri: string;
	fedoraDarkIconUri: string;
	debianIconUri: string;
	debianDarkIconUri: string;
	onCreateInstance: () => void;
	onCreateCustomInstance: () => void;
	onCreateCloudInitInstance: () => void;
	onCreateProfileInstance: () => void;
	onStartInstance: (name: string) => void;
	onStopInstance: (name: string) => void;
	onSuspendInstance: (name: string) => void;
	onShellInstance: (name: string) => void;
	onSetupSSHInstance: (name: string) => void;
	onStartAndShellInstance: (name: string) => void;
	onRecoverAndShellInstance: (name: string) => void;
	onDeleteInstance: (name: string) => void;
	onRecoverInstance: (name: string) => void;
	onPurgeInstance: (name: string) => void;
	onGetInstanceInfo: (name: string) => void;
	onRefreshList: () => void;
}

export const InstanceList: React.FC<InstanceListProps> = ({
	instanceLists,
	instanceInfo: propInstanceInfo,
	ubuntuIconUri,
	ubuntuDarkIconUri,
	fedoraIconUri,
	fedoraDarkIconUri,
	debianIconUri,
	debianDarkIconUri,
	onCreateInstance,
	onCreateCustomInstance,
	onCreateCloudInitInstance,
	onCreateProfileInstance,
	onStartInstance,
	onStopInstance,
	onSuspendInstance,
	onShellInstance,
	onSetupSSHInstance,
	onStartAndShellInstance,
	onRecoverAndShellInstance,
	onDeleteInstance,
	onRecoverInstance,
	onPurgeInstance,
	onGetInstanceInfo,
	onRefreshList
}) => {
	const { active, deleted } = instanceLists;
	const [expandedInstance, setExpandedInstance] = React.useState<string | null>(null);
	const [loadingInfo, setLoadingInfo] = React.useState(false);
	const [contextMenu, setContextMenu] = React.useState<{ x: number; y: number; instanceName: string; state: string } | null>(null);
	const [copiedInstance, setCopiedInstance] = React.useState<string | null>(null);
	const [showEmptyOptions, setShowEmptyOptions] = React.useState(false);

	// Helper function to get the correct icon based on OS
	const getDistroIcon = (release: string, isDark: boolean): string | null => {
		const releaseLower = release.toLowerCase();
		if (releaseLower.includes('fedora')) {
			return isDark ? fedoraDarkIconUri : fedoraIconUri;
		} else if (releaseLower.includes('debian')) {
			return isDark ? debianDarkIconUri : debianIconUri;
		} else if (releaseLower.includes('ubuntu')) {
			return isDark ? ubuntuDarkIconUri : ubuntuIconUri;
		}
		// Default to Ubuntu for unknown distros
		return isDark ? ubuntuDarkIconUri : ubuntuIconUri;
	};

	// Helper function to get distro name from release
	const getDistroName = (release: string): string => {
		// Extract the OS name (first word)
		const parts = release.split(' ');
		return parts[0] || '';
	};

	// Helper function to format release without OS name
	const formatRelease = (release: string): string => {
		// Remove the OS name (first word) from the release string
		const parts = release.split(' ');
		if (parts.length > 1) {
			return parts.slice(1).join(' ');
		}
		return release;
	};

	// Use the info from props
	const instanceInfo = propInstanceInfo;

	const toggleExpand = (name: string) => {
		if (expandedInstance === name) {
			setExpandedInstance(null);
		} else {
			setExpandedInstance(name);
			fetchInstanceInfo(name);
		}
	};

	const fetchInstanceInfo = (name: string) => {
		setLoadingInfo(true);
		onGetInstanceInfo(name);
	};

	// Reset loading state when info is received
	React.useEffect(() => {
		if (propInstanceInfo) {
			setLoadingInfo(false);
		}
	}, [propInstanceInfo]);

	// Poll for instance updates when there are instances in transitional states
	React.useEffect(() => {
		const hasTransitionalState = active.some(instance => {
			const state = instance.state.toLowerCase();
			// Check for any transitional or unknown states, or instances without IP
			return state === 'creating' ||
			       state === 'starting' ||
			       state === 'stopping' ||
			       state === 'unknown' ||
			       (state === 'running' && !instance.ipv4);
		});

		if (!hasTransitionalState) {
			return;
		}

		// Poll every 2 seconds
		const intervalId = setInterval(() => {
			// Trigger a full list refresh
			onRefreshList();
		}, 2000);

		return () => clearInterval(intervalId);
	}, [active, onRefreshList]);

	// Handle context menu
	const handleContextMenu = (e: React.MouseEvent, instanceName: string, state: string) => {
		e.preventDefault();
		e.stopPropagation();
		setContextMenu({
			x: e.clientX,
			y: e.clientY,
			instanceName,
			state
		});
	};

	// Close context menu on click outside
	React.useEffect(() => {
		const handleClick = () => setContextMenu(null);
		window.addEventListener('click', handleClick);
		return () => window.removeEventListener('click', handleClick);
	}, []);

	const EmptyHero = () => (
		<div style={{ width: '100%', maxWidth: '320px', paddingTop: '56px' }}>
			<div
				aria-hidden="true"
				style={{
					width: '58px',
					height: '58px',
					borderRadius: '50%',
					background: 'linear-gradient(135deg, #ff7336, #e95420)',
					margin: '0 0 24px',
					boxShadow: '0 10px 24px rgba(233,84,32,0.24)'
				}}
			/>
			<h2
				style={{
					fontSize: '24px',
					lineHeight: 1.45,
					fontWeight: 600,
					margin: '0 0 12px',
					color: 'var(--vscode-foreground)',
					letterSpacing: 0
				}}
			>
				Your pocket cloud,<br />right in VS Code.
			</h2>
			<p
				style={{
					margin: '0 0 24px',
					fontSize: '14px',
					color: 'var(--vscode-descriptionForeground)',
					lineHeight: 1.5,
					fontWeight: 400
				}}
			>
				Spin up Multipass Ubuntu VMs with cloud-init, mounts, and SSH when you need them.
			</p>
		</div>
	);

	if (active.length === 0 && deleted.length === 0) {
		if (!showEmptyOptions) {
			return (
				<div
					style={{
						minHeight: '100vh',
						padding: '24px 30px 20px',
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'center',
						justifyContent: 'flex-start',
						fontFamily: 'Ubuntu, system-ui, -apple-system, sans-serif'
					}}
				>
					<div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'stretch', width: '100%' }}>
						<EmptyHero />
						<button
							type="button"
							onClick={onCreateInstance}
							style={{
								background: '#E95420',
								color: '#ffffff',
								border: 'none',
								borderRadius: '3px',
								padding: '13px 28px',
								cursor: 'pointer',
								fontSize: '14px',
								fontWeight: 600,
								fontFamily: 'Ubuntu, system-ui, -apple-system, sans-serif',
								minWidth: '222px',
								minHeight: '48px',
								width: '100%'
							}}
							onMouseOver={(e) => {
								e.currentTarget.style.background = '#C7401A';
							}}
							onMouseOut={(e) => {
								e.currentTarget.style.background = '#E95420';
							}}
						>
							Quick install LTS
						</button>
						<button
							type="button"
							onClick={() => setShowEmptyOptions(true)}
							style={{
								marginTop: '24px',
								background: 'transparent',
								border: 'none',
								color: 'var(--vscode-descriptionForeground)',
								cursor: 'pointer',
								fontSize: '13px',
								fontWeight: 500,
								fontFamily: 'Ubuntu, system-ui, -apple-system, sans-serif',
								textDecoration: 'underline',
								textUnderlineOffset: '4px'
							}}
						>
							More options...
						</button>
					</div>
					<div
						style={{
							width: 'calc(100% + 60px)',
							margin: '0 -30px',
							padding: '14px 22px 0',
							borderTop: '1px solid rgba(127,127,127,0.13)',
							color: 'var(--vscode-descriptionForeground)',
							fontSize: '12px',
							display: 'flex',
							alignItems: 'center',
							gap: '10px',
							opacity: 0.75
						}}
					>
						<span aria-hidden="true">✓</span>
						<span>Multipass detected</span>
					</div>
				</div>
			);
		}

		const quickActionStyle: React.CSSProperties = {
			width: '100%',
			display: 'grid',
			gridTemplateColumns: '30px 1fr 16px',
			alignItems: 'center',
			gap: '12px',
			padding: '9px 0',
			background: 'transparent',
			border: 'none',
			color: 'var(--vscode-foreground)',
			cursor: 'pointer',
			textAlign: 'left',
			fontFamily: 'Ubuntu, system-ui, -apple-system, sans-serif'
		};
		const iconBoxStyle: React.CSSProperties = {
			width: '30px',
			height: '30px',
			borderRadius: '4px',
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
			background: 'rgba(255,255,255,0.04)',
			color: 'var(--vscode-descriptionForeground)'
		};
		const emptyOptionLabelStyle: React.CSSProperties = {
			display: 'block',
			fontSize: '13px',
			fontWeight: 500,
			color: 'var(--vscode-foreground)',
			lineHeight: 1.25
		};
		const emptyOptionDescriptionStyle: React.CSSProperties = {
			display: 'block',
			marginTop: '2px',
			fontSize: '12px',
			color: 'var(--vscode-descriptionForeground)',
			lineHeight: 1.25
		};
		const chevronRight = (
			<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
				<path d="M5.25 3.5L8.75 7L5.25 10.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
			</svg>
		);

		return (
			<div
				style={{
					minHeight: '100vh',
						padding: '24px 30px 36px',
						display: 'flex',
						flexDirection: 'column',
						fontFamily: 'Ubuntu, system-ui, -apple-system, sans-serif',
						background: 'linear-gradient(135deg, transparent 0 58%, rgba(233,84,32,0.16) 58% 100%)'
				}}
			>
				<EmptyHero />

				<button
					type="button"
					onClick={onCreateInstance}
					style={{
						background: '#E95420',
						color: '#ffffff',
						border: 'none',
						borderRadius: '3px',
						padding: '11px 18px',
						cursor: 'pointer',
						fontSize: '13px',
						fontWeight: 600,
						fontFamily: 'Ubuntu, system-ui, -apple-system, sans-serif',
						display: 'inline-flex',
						alignItems: 'center',
						justifyContent: 'center',
						gap: '8px',
						minHeight: '40px',
						marginBottom: '28px',
						width: '100%'
					}}
					onMouseOver={(e) => {
						e.currentTarget.style.background = '#C7401A';
					}}
					onMouseOut={(e) => {
						e.currentTarget.style.background = '#E95420';
					}}
				>
					<span style={{ fontSize: '18px', lineHeight: 1 }}>+</span>
					<span>Quick install LTS</span>
				</button>

				<div
					style={{
						borderTop: '1px solid rgba(127,127,127,0.13)',
						paddingTop: '22px'
					}}
				>
					<div
						style={{
							fontSize: '11px',
							textTransform: 'uppercase',
							letterSpacing: '2px',
							color: 'var(--vscode-descriptionForeground)',
							fontWeight: 700,
							marginBottom: '18px'
						}}
					>
						Other options
					</div>

					<div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
						<button type="button" style={quickActionStyle} onClick={onCreateCustomInstance}>
							<span style={iconBoxStyle}>☼</span>
							<span>
								<span style={emptyOptionLabelStyle}>Configure a custom instance</span>
								<span style={emptyOptionDescriptionStyle}>Pick CPU, RAM, disk, image</span>
							</span>
							<span style={{ color: 'var(--vscode-descriptionForeground)' }}>{chevronRight}</span>
						</button>
						<button type="button" style={quickActionStyle} onClick={onCreateCloudInitInstance}>
							<span style={iconBoxStyle}>▣</span>
							<span>
								<span style={emptyOptionLabelStyle}>Open cloud-init YAML</span>
								<span style={emptyOptionDescriptionStyle}>Edit, validate, then launch</span>
							</span>
							<span style={{ color: 'var(--vscode-descriptionForeground)' }}>{chevronRight}</span>
						</button>
						<button type="button" style={quickActionStyle} onClick={onCreateProfileInstance}>
							<span style={iconBoxStyle}>□</span>
							<span>
								<span style={emptyOptionLabelStyle}>Your profiles</span>
								<span style={emptyOptionDescriptionStyle}>Reusable Multipass configurations</span>
							</span>
							<span style={{ color: 'var(--vscode-descriptionForeground)' }}>{chevronRight}</span>
						</button>
					</div>
				</div>
			</div>
		);
	}

	const getStateStyle = (state: string) => {
		const stateLower = state.toLowerCase();
		const baseStyle: React.CSSProperties = {
			fontSize: '9px',
			textTransform: 'uppercase',
			letterSpacing: '1.5px',
			fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
			fontWeight: 600,
			opacity: 0.9
		};

		if (stateLower === 'running') {
			return { ...baseStyle, color: '#10b981' };
		}
		if (stateLower === 'deleted') {
			return { ...baseStyle, color: '#6b7280', opacity: 0.6 };
		}
		if (stateLower === 'stopped') {
			return { ...baseStyle, color: '#525252' };
		}
		if (stateLower === 'downloading image' || stateLower.includes('downloading')) {
			return { ...baseStyle, color: '#E95420', animation: 'pulse 1.5s ease-in-out infinite' };
		}
		// Transitional / unknown -> amber
		return { ...baseStyle, color: '#f59e0b', animation: 'pulse 1.5s ease-in-out infinite' };
	};

	const truncateName = (name: string, maxLength: number = MAX_VM_NAME_DISPLAY_CHARS): string => {
		if (name.length <= maxLength) return name;
		return name.substring(0, maxLength - 1) + '…';
	};

	const nameStyle = (release: string, running = false): React.CSSProperties => ({
		fontSize: '14px',
		fontWeight: 300,
		color: running ? 'var(--vscode-editor-foreground)' : 'var(--vscode-descriptionForeground)',
		fontFamily: getDistributionFont(release),
		minWidth: 0,
		maxWidth: '160px',
		overflow: 'hidden',
		textOverflow: 'ellipsis',
		whiteSpace: 'nowrap'
	});

	const Chevron: React.FC<{ expanded: boolean }> = ({ expanded }) => (
		<svg
			width="14"
			height="14"
			viewBox="0 0 14 14"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			style={{
				transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
				transition: 'transform 0.15s ease',
				color: '#6b7280'
			}}
			aria-hidden="true"
		>
			<path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);

	// Order active instances: running -> suspended -> stopped -> others
	const orderPriority: Record<string, number> = {
		running: 0,
		suspended: 1,
		stopped: 2,
	};
	const orderedActive = [...active].sort((a, b) => {
		const pa = orderPriority[a.state.toLowerCase()] ?? 3;
		const pb = orderPriority[b.state.toLowerCase()] ?? 3;
		if (pa !== pb) return pa - pb;
		// Stable tie-breaker by name
		return a.name.localeCompare(b.name);
	});

	return (
		<div style={{ padding: '12px 16px 32px' }}>
			{/* Active header */}
			{active.length > 0 && (
				<div style={{
					fontSize: '9px',
					textTransform: 'uppercase',
					letterSpacing: '1.2px',
					color: 'var(--vscode-descriptionForeground)',
					marginBottom: '18px',
					fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
					opacity: 0.7
				}}>Active</div>
			)}
			<ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
				{orderedActive.map(instance => {
					const isExpanded = expandedInstance === instance.name;
					const stateLower = instance.state.toLowerCase();
					const isRunning = stateLower === 'running';
					const canExpand = stateLower === 'running' || stateLower === 'stopped' || stateLower === 'suspended';
					const showBorder = !(isExpanded && canExpand);

					return (
						<li key={instance.name} style={{ margin: 0 }}>
							<div
								onClick={() => canExpand && toggleExpand(instance.name)}
								onContextMenu={(e) => handleContextMenu(e, instance.name, instance.state)}
								style={{
									padding: '12px 0',
									borderBottom: showBorder ? '1px solid rgba(127,127,127,0.25)' : 'none',
									cursor: canExpand ? 'pointer' : 'default',
									transition: 'border-color 0.15s ease',
								}}
								onMouseOver={(e) => {
									if (canExpand && showBorder) {
										e.currentTarget.style.borderBottom = '1px solid rgba(127,127,127,0.4)';
									}
								}}
								onMouseOut={(e) => {
									if (showBorder) {
										e.currentTarget.style.borderBottom = '1px solid rgba(127,127,127,0.25)';
									}
								}}
							>
								{(stateLower === 'stopped' || stateLower === 'suspended') ? (
									<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
										<div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
											<button
												type="button"
												aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
												title={isExpanded ? 'Collapse details' : 'Expand details'}
												onClick={(e) => {
													e.stopPropagation();
													toggleExpand(instance.name);
												}}
												style={{
													background: 'transparent',
													border: 'none',
													padding: 0,
													width: '18px',
													height: '18px',
													display: 'flex',
													alignItems: 'center',
													justifyContent: 'center',
													cursor: 'pointer'
												}}
											>
												<Chevron expanded={isExpanded} />
											</button>
											<div
												style={nameStyle(instance.release)}
												title={instance.name}
											>
												{truncateName(instance.name)}
											</div>
										</div>
										<div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
											<div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
												{getDistroIcon(instance.release, true) && (
													<img
														src={getDistroIcon(instance.release, true) || ''}
														alt={getDistroName(instance.release)}
														style={{ width: '12px', height: '12px', opacity: 0.85 }}
													/>
												)}
												<div style={{ fontSize: '11px', color: '#6b7280', fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
													{formatRelease(instance.release)}
												</div>
											</div>
											<span style={getStateStyle(instance.state)}>{instance.state}</span>
										</div>
									</div>
								) : (
									<>
										<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
											<div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
												<div
													style={nameStyle(instance.release, isRunning)}
													title={instance.name}
												>
													{truncateName(instance.name)}
												</div>
											</div>
											<span style={getStateStyle(instance.state)}>{instance.state}</span>
										</div>
										<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '10px', color: '#525252' }}>
											<div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
												{getDistroIcon(instance.release, false) && (
													<img
														src={getDistroIcon(instance.release, false) || ''}
														alt={getDistroName(instance.release)}
														style={{ width: '12px', height: '12px', opacity: 0.85 }}
													/>
												)}
												<div style={{ fontSize: '11px', color: '#6b7280', fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
													{formatRelease(instance.release)}
												</div>
											</div>
											<div style={{ display: 'flex', justifyContent: 'center', flex: 1 }}>
												{isRunning && (
													<button
														type="button"
														aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
														title={isExpanded ? 'Collapse details' : 'Expand details'}
														onClick={(e) => {
															e.stopPropagation();
															toggleExpand(instance.name);
														}}
														style={{
															background: 'transparent',
															border: 'none',
															padding: 0,
															width: '18px',
															height: '18px',
															display: 'flex',
															alignItems: 'center',
															justifyContent: 'center',
															cursor: 'pointer'
														}}
													>
														<Chevron expanded={isExpanded} />
													</button>
												)}
											</div>
											<div style={{ display: 'flex', alignItems: 'center', gap: '6px', position: 'relative', zIndex: 10 }}>
												{isRunning && instance.ipv4 && (
													<>
														<button
															onClick={(e) => {
																e.stopPropagation();
																navigator.clipboard.writeText(instance.ipv4);
																setCopiedInstance(instance.name);
																setTimeout(() => setCopiedInstance(null), 2000);
															}}
															style={{
																background: 'transparent',
																border: 'none',
																cursor: 'pointer',
																padding: '0',
																display: 'flex',
																alignItems: 'center',
																color: '#6b7280',
																opacity: 0.7,
																transition: 'opacity 0.2s ease',
																width: '12px',
																height: '12px',
																position: 'relative'
															}}
															onMouseOver={(e) => {
																e.currentTarget.style.opacity = '1';
															}}
															onMouseOut={(e) => {
																e.currentTarget.style.opacity = '0.7';
															}}
															title="Copy IP address"
														>
															<svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
																<path d="M7.5 3H14.6C16.8402 3 17.9603 3 18.816 3.43597C19.5686 3.81947 20.1805 4.43139 20.564 5.18404C21 6.03969 21 7.15979 21 9.4V16.5M6.2 21H14.3C15.4201 21 15.9802 21 16.408 20.782C16.7843 20.5903 17.0903 20.2843 17.282 19.908C17.5 19.4802 17.5 18.9201 17.5 17.8V9.7C17.5 8.57989 17.5 8.01984 17.282 7.59202C17.0903 7.21569 16.7843 6.90973 16.408 6.71799C15.9802 6.5 15.4201 6.5 14.3 6.5H6.2C5.0799 6.5 4.51984 6.5 4.09202 6.71799C3.71569 6.90973 3.40973 7.21569 3.21799 7.59202C3 8.01984 3 8.57989 3 9.7V17.8C3 18.9201 3 19.4802 3.21799 19.908C3.40973 20.2843 3.71569 20.5903 4.09202 20.782C4.51984 21 5.0799 21 6.2 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
															</svg>
															{copiedInstance === instance.name && (
																<div style={{
																	position: 'absolute',
																	top: '-28px',
																	left: '50%',
																	transform: 'translateX(-50%)',
																	background: 'var(--vscode-notifications-background)',
																	color: 'var(--vscode-notifications-foreground)',
																	border: '1px solid var(--vscode-notifications-border)',
																	padding: '4px 8px',
																	borderRadius: '3px',
																	fontSize: '10px',
																	whiteSpace: 'nowrap',
																	fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
																	boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
																	zIndex: 1000,
																	pointerEvents: 'none'
																}}>
																	Copied!
																</div>
															)}
														</button>
														<div style={{ fontFamily: getMonoFont(), fontSize: '11px', color: '#4b5563' }}>
															{instance.ipv4}
														</div>
													</>
												)}
											</div>
										</div>
									</>
								)}
							</div>

							{isExpanded && canExpand && (
								<div style={{
									padding: '0',
									background: 'rgba(0,0,0,0.05)'
								}}>
									{loadingInfo ? (
										<div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--vscode-descriptionForeground)', fontFamily: 'Inter, system-ui, -apple-system, sans-serif', padding: '20px 0' }}>Loading details...</div>
									) : instanceInfo ? (
										<InstanceDetails
											info={instanceInfo}
											onDelete={onDeleteInstance}
											onStart={onStartInstance}
											onStop={onStopInstance}
											onSuspend={onSuspendInstance}
											onShell={onShellInstance}
											onSetupSSH={onSetupSSHInstance}
											onRecover={onRecoverInstance}
											onPurge={onPurgeInstance}
										/>
									) : (
										<div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--vscode-errorForeground)', fontFamily: 'Inter, system-ui, -apple-system, sans-serif', padding: '20px 0' }}>Failed to load instance details</div>
									)}
								</div>
							)}
						</li>
					);
				})}
			</ul>

			{/* Deleted Section */}
			{deleted.length > 0 && (
				<div style={{ marginTop: '40px' }}>
					<div style={{
						fontSize: '9px',
						textTransform: 'uppercase',
						letterSpacing: '1.2px',
						color: 'var(--vscode-descriptionForeground)',
						marginBottom: '14px',
						fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
						opacity: 0.55
					}}>Deleted</div>
					<ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
						{deleted.map(instance => (
							<li key={instance.name} style={{ padding: '10px 0', borderBottom: '1px solid rgba(127,127,127,0.15)' }}>
								<div
									style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
									onContextMenu={(e) => handleContextMenu(e, instance.name, instance.state)}
								>
									<div
										style={{ ...nameStyle(instance.release), opacity: 0.6 }}
										title={instance.name}
									>
										{truncateName(instance.name)}
									</div>
									<div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
										{(ubuntuIconUri || ubuntuDarkIconUri) && (
											<img
												src={ubuntuDarkIconUri}
												alt="Ubuntu"
												style={{ width: '12px', height: '12px', opacity: 0.6 }}
											/>
										)}
										<div style={{ fontSize: '11px', color: '#6b7280', fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>{instance.release.replace(/^Ubuntu\s*/i, '')}</div>
									</div>
								</div>
							</li>
						))}
					</ul>
				</div>
			)}

			{/* Context Menu */}
			{contextMenu && (
				<div
					style={{
						position: 'fixed',
						left: `${contextMenu.x}px`,
						top: `${contextMenu.y}px`,
						background: 'var(--vscode-menu-background)',
						border: '1px solid var(--vscode-menu-border)',
						borderRadius: '4px',
						boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
						padding: '4px 0',
						minWidth: '150px',
						zIndex: 1000,
						fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
					}}
					onClick={(e: React.MouseEvent) => e.stopPropagation()}
				>
					{contextMenu.state.toLowerCase() === 'running' && (
						<>
							<div
								onClick={() => {
									onShellInstance(contextMenu.instanceName);
									setContextMenu(null);
								}}
								style={{
									padding: '6px 12px',
									cursor: 'pointer',
									fontSize: '12px',
									color: 'var(--vscode-menu-foreground)',
									display: 'flex',
									alignItems: 'center',
									gap: '8px',
								}}
								onMouseOver={(e) => {
									e.currentTarget.style.background = 'var(--vscode-menu-selectionBackground)';
									e.currentTarget.style.color = 'var(--vscode-menu-selectionForeground)';
								}}
								onMouseOut={(e) => {
									e.currentTarget.style.background = 'transparent';
									e.currentTarget.style.color = 'var(--vscode-menu-foreground)';
								}}
							>
								Open Shell
							</div>
							<div
								onClick={() => {
									onSuspendInstance(contextMenu.instanceName);
									setContextMenu(null);
								}}
								style={{
									padding: '6px 12px',
									cursor: 'pointer',
									fontSize: '12px',
									color: 'var(--vscode-menu-foreground)',
									display: 'flex',
									alignItems: 'center',
									gap: '8px',
								}}
								onMouseOver={(e) => {
									e.currentTarget.style.background = 'var(--vscode-menu-selectionBackground)';
									e.currentTarget.style.color = 'var(--vscode-menu-selectionForeground)';
								}}
								onMouseOut={(e) => {
									e.currentTarget.style.background = 'transparent';
									e.currentTarget.style.color = 'var(--vscode-menu-foreground)';
								}}
							>
								<span>⏸</span>
								Pause (Suspend)
							</div>
							<div
								onClick={() => {
									onStopInstance(contextMenu.instanceName);
									setContextMenu(null);
								}}
								style={{
									padding: '6px 12px',
									cursor: 'pointer',
									fontSize: '12px',
									color: 'var(--vscode-menu-foreground)',
									display: 'flex',
									alignItems: 'center',
									gap: '8px',
								}}
								onMouseOver={(e) => {
									e.currentTarget.style.background = 'var(--vscode-menu-selectionBackground)';
									e.currentTarget.style.color = 'var(--vscode-menu-selectionForeground)';
								}}
								onMouseOut={(e) => {
									e.currentTarget.style.background = 'transparent';
									e.currentTarget.style.color = 'var(--vscode-menu-foreground)';
								}}
							>
								<span>⏹</span>
								Stop Instance
							</div>
						</>
					)}
						{contextMenu.state.toLowerCase() === 'stopped' && (
						<>
							<div
								onClick={() => {
									onStartInstance(contextMenu.instanceName);
									setContextMenu(null);
								}}
								style={{
									padding: '6px 12px',
									cursor: 'pointer',
									fontSize: '12px',
									color: 'var(--vscode-menu-foreground)',
									display: 'flex',
									alignItems: 'center',
									gap: '8px',
								}}
								onMouseOver={(e) => {
									e.currentTarget.style.background = 'var(--vscode-menu-selectionBackground)';
									e.currentTarget.style.color = 'var(--vscode-menu-selectionForeground)';
								}}
								onMouseOut={(e) => {
									e.currentTarget.style.background = 'transparent';
									e.currentTarget.style.color = 'var(--vscode-menu-foreground)';
								}}
							>
								<span>▶</span>
								Start Instance
							</div>
							<div
								onClick={() => {
									onStartAndShellInstance(contextMenu.instanceName);
									setContextMenu(null);
								}}
								style={{
									padding: '6px 12px',
									cursor: 'pointer',
									fontSize: '12px',
									color: 'var(--vscode-menu-foreground)',
									display: 'flex',
									alignItems: 'center',
									gap: '8px',
								}}
								onMouseOver={(e) => {
									e.currentTarget.style.background = 'var(--vscode-menu-selectionBackground)';
									e.currentTarget.style.color = 'var(--vscode-menu-selectionForeground)';
								}}
								onMouseOut={(e) => {
									e.currentTarget.style.background = 'transparent';
									e.currentTarget.style.color = 'var(--vscode-menu-foreground)';
								}}
							>
								Start and Shell
							</div>
						</>
					)}
						{contextMenu.state.toLowerCase() === 'suspended' && (
						<>
							<div
								onClick={() => {
									onStartInstance(contextMenu.instanceName);
									setContextMenu(null);
								}}
								style={{
									padding: '6px 12px',
									cursor: 'pointer',
									fontSize: '12px',
									color: 'var(--vscode-menu-foreground)',
									display: 'flex',
									alignItems: 'center',
									gap: '8px',
								}}
								onMouseOver={(e) => {
									e.currentTarget.style.background = 'var(--vscode-menu-selectionBackground)';
									e.currentTarget.style.color = 'var(--vscode-menu-selectionForeground)';
								}}
								onMouseOut={(e) => {
									e.currentTarget.style.background = 'transparent';
									e.currentTarget.style.color = 'var(--vscode-menu-foreground)';
								}}
							>
								<span>▶</span>
								Start Instance
							</div>
							<div
								onClick={() => {
									onStartAndShellInstance(contextMenu.instanceName);
									setContextMenu(null);
								}}
								style={{
									padding: '6px 12px',
									cursor: 'pointer',
									fontSize: '12px',
									color: 'var(--vscode-menu-foreground)',
									display: 'flex',
									alignItems: 'center',
									gap: '8px',
								}}
								onMouseOver={(e) => {
									e.currentTarget.style.background = 'var(--vscode-menu-selectionBackground)';
									e.currentTarget.style.color = 'var(--vscode-menu-selectionForeground)';
								}}
								onMouseOut={(e) => {
									e.currentTarget.style.background = 'transparent';
									e.currentTarget.style.color = 'var(--vscode-menu-foreground)';
								}}
							>
								Start and Shell
							</div>
						</>
					)}
						{contextMenu.state.toLowerCase() === 'deleted' && (
						<>
							<div
								onClick={() => {
									onRecoverInstance(contextMenu.instanceName);
									setContextMenu(null);
								}}
								style={{
									padding: '6px 12px',
									cursor: 'pointer',
									fontSize: '12px',
									color: 'var(--vscode-menu-foreground)',
									display: 'flex',
									alignItems: 'center',
									gap: '8px',
								}}
								onMouseOver={(e) => {
									e.currentTarget.style.background = 'var(--vscode-menu-selectionBackground)';
									e.currentTarget.style.color = 'var(--vscode-menu-selectionForeground)';
								}}
								onMouseOut={(e) => {
									e.currentTarget.style.background = 'transparent';
									e.currentTarget.style.color = 'var(--vscode-menu-foreground)';
								}}
							>
								Recover Instance
							</div>
							<div
								onClick={() => {
									onRecoverAndShellInstance(contextMenu.instanceName);
									setContextMenu(null);
								}}
								style={{
									padding: '6px 12px',
									cursor: 'pointer',
									fontSize: '12px',
									color: 'var(--vscode-menu-foreground)',
									display: 'flex',
									alignItems: 'center',
									gap: '8px',
								}}
								onMouseOver={(e) => {
									e.currentTarget.style.background = 'var(--vscode-menu-selectionBackground)';
									e.currentTarget.style.color = 'var(--vscode-menu-selectionForeground)';
								}}
								onMouseOut={(e) => {
									e.currentTarget.style.background = 'transparent';
									e.currentTarget.style.color = 'var(--vscode-menu-foreground)';
								}}
							>
								Recover and Shell
							</div>
							<div
								onClick={() => {
									onPurgeInstance(contextMenu.instanceName);
									setContextMenu(null);
								}}
								style={{
									padding: '6px 12px',
									cursor: 'pointer',
									fontSize: '12px',
									color: '#f44336',
									display: 'flex',
									alignItems: 'center',
									gap: '8px',
									borderTop: '1px solid var(--vscode-menu-separatorBackground)',
									marginTop: '4px',
									paddingTop: '8px',
								}}
								onMouseOver={(e) => {
									e.currentTarget.style.background = 'var(--vscode-menu-selectionBackground)';
								}}
								onMouseOut={(e) => {
									e.currentTarget.style.background = 'transparent';
								}}
							>
								Purge Instance
							</div>
						</>
					)}
						{contextMenu.state.toLowerCase() !== 'deleted' && (
						<div
							onClick={() => {
								onDeleteInstance(contextMenu.instanceName);
								setContextMenu(null);
							}}
							style={{
								padding: '6px 12px',
								cursor: 'pointer',
								fontSize: '12px',
								color: 'var(--vscode-errorForeground)',
								display: 'flex',
								alignItems: 'center',
								gap: '8px',
								borderTop: '1px solid var(--vscode-menu-separatorBackground)',
								marginTop: '4px',
								paddingTop: '8px',
							}}
							onMouseOver={(e) => {
								e.currentTarget.style.background = 'var(--vscode-menu-selectionBackground)';
							}}
							onMouseOut={(e) => {
								e.currentTarget.style.background = 'transparent';
							}}
						>

							Delete Instance
						</div>
					)}
				</div>
			)}

			<style>{`
				@keyframes pulse {
					0%, 100% { opacity: 1; }
					50% { opacity: 0.6; }
				}
				@keyframes blink {
					0%, 100% { opacity: 1; }
					50% { opacity: 0.3; }
				}
			`}</style>
		</div>
	);
};


export default  InstanceList
