import { InstanceLists, MultipassInstanceInfo } from '../../multipassService';
import { getDistributionFont, getMonoFont } from '../utils/fontUtils';

import { InstanceDetails } from './InstanceDetails';
import React from 'react';

interface InstanceListProps {
	instanceLists: InstanceLists;
	instanceInfo: MultipassInstanceInfo | null;
	ubuntuIconUri: string;
	ubuntuDarkIconUri: string;
	onCreateInstance: () => void;
	onStartInstance: (name: string) => void;
	onStopInstance: (name: string) => void;
	onSuspendInstance: (name: string) => void;
	onShellInstance: (name: string) => void;
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
	onCreateInstance,
	onStartInstance,
	onStopInstance,
	onSuspendInstance,
	onShellInstance,
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

	if (active.length === 0 && deleted.length === 0) {
		return (
			<div style={{ padding: '20px', textAlign: 'center', color: 'var(--vscode-descriptionForeground)' }}>
				<p style={{
					marginBottom: '20px',
					fontSize: '14px',
					fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
				}}>No instances found.</p>
				<button
					onClick={onCreateInstance}
					style={{
						background: '#0E8420',
						color: '#ffffff',
						border: 'none',
						padding: '12px 24px',
						cursor: 'pointer',
						fontSize: '14px',
						fontWeight: '500',
						fontFamily: 'Ubuntu, Inter, system-ui, -apple-system, sans-serif',
						display: 'inline-flex',
						alignItems: 'center',
						gap: '10px',
						transition: 'all 0.2s ease',
						boxShadow: '0 2px 8px rgba(14, 132, 32, 0.3)',
						letterSpacing: '0.3px',
						borderRadius: '4px',
					}}
					onMouseOver={(e) => {
						e.currentTarget.style.background = '#17aa2f';
						e.currentTarget.style.boxShadow = '0 4px 12px rgba(14, 132, 32, 0.4)';
					}}
					onMouseOut={(e) => {
						e.currentTarget.style.background = '#0E8420';
						e.currentTarget.style.boxShadow = '0 2px 8px rgba(14, 132, 32, 0.3)';
					}}
					onMouseDown={(e) => {
						e.currentTarget.style.background = '#0a6817';
						e.currentTarget.style.boxShadow = '0 1px 4px rgba(14, 132, 32, 0.2)';
					}}
					onMouseUp={(e) => {
						e.currentTarget.style.background = '#17aa2f';
						e.currentTarget.style.boxShadow = '0 4px 12px rgba(14, 132, 32, 0.4)';
					}}
				>
					Create new instance
				</button>
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
		// Transitional / unknown -> amber
		return { ...baseStyle, color: '#f59e0b', animation: 'pulse 1.5s ease-in-out infinite' };
	};

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
				{active.map(instance => {
					const isExpanded = expandedInstance === instance.name;
					const isRunning = instance.state.toLowerCase() === 'running';
					const showBorder = !(isExpanded && isRunning);

					return (
						<li key={instance.name} style={{ margin: 0 }}>
							<div
								onClick={() => isRunning && toggleExpand(instance.name)}
								onContextMenu={(e) => handleContextMenu(e, instance.name, instance.state)}
								style={{
									padding: '12px 0',
									borderBottom: showBorder ? '1px solid rgba(127,127,127,0.25)' : 'none',
									cursor: isRunning ? 'pointer' : 'default',
									transition: 'border-color 0.15s ease',
								}}
								onMouseOver={(e) => {
									if (isRunning && showBorder) {
										e.currentTarget.style.borderBottom = '1px solid rgba(127,127,127,0.4)';
									}
								}}
								onMouseOut={(e) => {
									if (showBorder) {
										e.currentTarget.style.borderBottom = '1px solid rgba(127,127,127,0.25)';
									}
								}}
							>
								<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
									<div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
										<div style={{
											fontSize: '14px',
											fontWeight: 300,
											color: isRunning ? 'var(--vscode-editor-foreground)' : 'var(--vscode-descriptionForeground)',
											fontFamily: getDistributionFont(instance.release)
										}}>{instance.name}</div>
									</div>
									<span style={getStateStyle(instance.state)}>{instance.state}</span>
								</div>
								<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '10px', color: '#525252' }}>
									{/* Bottom-left: OS icon + release */}
									<div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
										{(ubuntuIconUri || ubuntuDarkIconUri) && (
											<img
												src={(instance.state.toLowerCase() === 'stopped' || instance.state.toLowerCase() === 'suspended') ? ubuntuDarkIconUri : ubuntuIconUri}
												alt="Ubuntu"
												style={{ width: '12px', height: '12px', opacity: 0.85 }}
											/>
										)}
										<div style={{ fontSize: '11px', color: '#6b7280', fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
											{instance.release.replace(/^Ubuntu\s*/i, '')}
										</div>
									</div>

									{/* Centered arrow */}
									<div style={{ display: 'flex', justifyContent: 'center', flex: 1 }}>
										{isRunning && (
											<div style={{
												fontSize: '11px',
												color: '#6b7280',
												transition: 'transform 0.2s ease',
												transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
											}}>↓</div>
										)}
									</div>

									{/* Bottom-right IP */}
									<div style={{ fontFamily: getMonoFont(), fontSize: '11px', color: '#4b5563' }}>
										{isRunning && instance.ipv4 ? instance.ipv4 : ''}
									</div>
								</div>
							</div>

							{isExpanded && isRunning && (
								<div style={{
									padding: '0',
									background: 'rgba(0,0,0,0.05)'
								}}>
									{loadingInfo ? (
										<div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--vscode-descriptionForeground)', fontFamily: 'Inter, system-ui, -apple-system, sans-serif', padding: '20px 0' }}>Loading details...</div>
									) : instanceInfo ? (
										<InstanceDetails info={instanceInfo} onDelete={onDeleteInstance} />
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
								<div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
									<div style={{ fontSize: '14px', fontWeight: 300, color: 'var(--vscode-descriptionForeground)', fontFamily: getDistributionFont(instance.release), opacity: 0.6 }}>{instance.name}</div>
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
								<span>🖥️</span>
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
								<span>🖥️</span>
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
								<span>♻️</span>
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
								<span>🖥️</span>
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
								<span>⚠️</span>
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
							<span>🗑</span>
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