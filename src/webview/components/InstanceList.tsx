import { InstanceLists, MultipassInstanceInfo } from '../../multipassService';
import { getDistributionFont, getMonoFont } from '../utils/fontUtils';

import { EmptyInstanceState } from './InstanceList/EmptyInstanceState';
import { InlineLaunchForm } from './InstanceList/InlineLaunchForm';
import { InstanceContextMenu } from './InstanceList/InstanceContextMenu';
import { InstanceDetails } from './InstanceDetails';
import { LaunchOptionsPanel } from './InstanceList/LaunchOptionsPanel';
import type { InlineLaunchConfig } from '../App';
import type { MultipassCapabilities } from '../../utils/multipassVersion';
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
	onLaunchFromInlineForm: (config: InlineLaunchConfig) => void;
	multipassCapabilities: MultipassCapabilities;
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
	onCreateCloudInitInstance,
	onCreateProfileInstance,
	onLaunchFromInlineForm,
	multipassCapabilities,
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
	const [optimisticLaunches, setOptimisticLaunches] = React.useState<Array<{ name: string; release: string }>>([]);
	const [expandedInstance, setExpandedInstance] = React.useState<string | null>(null);
	const [loadingInfo, setLoadingInfo] = React.useState(false);
	const [contextMenu, setContextMenu] = React.useState<{ x: number; y: number; instanceName: string; state: string } | null>(null);
	const [copiedInstance, setCopiedInstance] = React.useState<string | null>(null);
	const [inlineLaunchMode, setInlineLaunchMode] = React.useState<'quick' | 'custom' | null>(null);
	const [showLaunchOptions, setShowLaunchOptions] = React.useState(false);
	const activeWithOptimistic = React.useMemo(() => {
		const realNames = new Set(active.map((instance) => instance.name));
		const synthetic = optimisticLaunches
			.filter((launch) => !realNames.has(launch.name))
			.map((launch) => ({
				name: launch.name,
				state: 'Downloading Image',
				ipv4: '',
				release: launch.release
			}));
		return [...synthetic, ...active];
	}, [active, optimisticLaunches]);

	React.useEffect(() => {
		if (optimisticLaunches.length === 0) {
			return;
		}
		const realNames = new Set(active.map((instance) => instance.name));
		setOptimisticLaunches((launches) => launches.filter((launch) => !realNames.has(launch.name)));
	}, [active, optimisticLaunches.length]);

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
		const hasTransitionalState = activeWithOptimistic.some(instance => {
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
	}, [activeWithOptimistic, onRefreshList]);

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

	const addOptimisticLaunch = (launch: { name: string; release: string }) => {
		setOptimisticLaunches((launches) => [
			launch,
			...launches.filter((existing) => existing.name !== launch.name)
		]);
	};

	if (activeWithOptimistic.length === 0 && deleted.length === 0) {
		return (
			<EmptyInstanceState
				ubuntuIconUri={ubuntuIconUri}
				ubuntuDarkIconUri={ubuntuDarkIconUri}
				fedoraIconUri={fedoraIconUri}
				fedoraDarkIconUri={fedoraDarkIconUri}
				debianIconUri={debianIconUri}
				debianDarkIconUri={debianDarkIconUri}
				multipassCapabilities={multipassCapabilities}
				onCreateCloudInitInstance={onCreateCloudInitInstance}
				onCreateProfileInstance={onCreateProfileInstance}
				onLaunchFromInlineForm={onLaunchFromInlineForm}
				onOptimisticLaunch={addOptimisticLaunch}
			/>
		);
	}

	if (inlineLaunchMode) {
		return (
			<InlineLaunchForm
				mode={inlineLaunchMode}
				ubuntuIconUri={ubuntuIconUri}
				ubuntuDarkIconUri={ubuntuDarkIconUri}
				fedoraIconUri={fedoraIconUri}
				fedoraDarkIconUri={fedoraDarkIconUri}
				debianIconUri={debianIconUri}
				debianDarkIconUri={debianDarkIconUri}
				multipassCapabilities={multipassCapabilities}
				onBack={() => setInlineLaunchMode(null)}
				onLaunchFromInlineForm={onLaunchFromInlineForm}
				onOptimisticLaunch={addOptimisticLaunch}
			/>
		);
	}

	if (showLaunchOptions) {
		const openInlineForm = (mode: 'quick' | 'custom') => {
			setShowLaunchOptions(false);
			setInlineLaunchMode(mode);
		};

		return (
			<LaunchOptionsPanel
				onQuick={() => openInlineForm('quick')}
				onCustom={() => openInlineForm('custom')}
				onCreateCloudInitInstance={onCreateCloudInitInstance}
				onCreateProfileInstance={onCreateProfileInstance}
				onBack={() => setShowLaunchOptions(false)}
			/>
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
	const orderedActive = [...activeWithOptimistic].sort((a, b) => {
		const pa = orderPriority[a.state.toLowerCase()] ?? 3;
		const pb = orderPriority[b.state.toLowerCase()] ?? 3;
		if (pa !== pb) return pa - pb;
		// Stable tie-breaker by name
		return a.name.localeCompare(b.name);
	});

	return (
		<div style={{ padding: '12px 16px 32px' }}>
			{/* Active header */}
			{activeWithOptimistic.length > 0 && (
				<div style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					marginBottom: '18px',
				}}>
					<div style={{
						fontSize: '9px',
						textTransform: 'uppercase',
						letterSpacing: '1.2px',
						color: 'var(--vscode-descriptionForeground)',
						fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
						opacity: 0.7
					}}>Active</div>
					<button
						type="button"
						onClick={() => setShowLaunchOptions(true)}
						style={{
							background: 'transparent',
							border: 'none',
							color: '#E95420',
							cursor: 'pointer',
							fontSize: '11px',
							fontWeight: 600,
							fontFamily: 'Ubuntu, system-ui, -apple-system, sans-serif',
							padding: '2px 0',
							lineHeight: 1.2
						}}
						onMouseEnter={(e) => {
							e.currentTarget.style.color = '#ff7336';
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.color = '#E95420';
						}}
					>
						New instance
					</button>
				</div>
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

			{contextMenu && (
				<InstanceContextMenu
					contextMenu={contextMenu}
					onClose={() => setContextMenu(null)}
					onShellInstance={onShellInstance}
					onSuspendInstance={onSuspendInstance}
					onStopInstance={onStopInstance}
					onStartInstance={onStartInstance}
					onStartAndShellInstance={onStartAndShellInstance}
					onRecoverInstance={onRecoverInstance}
					onRecoverAndShellInstance={onRecoverAndShellInstance}
					onPurgeInstance={onPurgeInstance}
					onDeleteInstance={onDeleteInstance}
				/>
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
