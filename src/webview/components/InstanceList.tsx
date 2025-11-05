import { InstanceLists, MultipassInstanceInfo } from '../../multipassService';

import { InstanceDetails } from './InstanceDetails';
import React from 'react';

interface InstanceListProps {
	instanceLists: InstanceLists;
	instanceInfo: MultipassInstanceInfo | null;
	ubuntuIconUri: string;
	onCreateInstance: () => void;
	onStartInstance: (name: string) => void;
	onStopInstance: (name: string) => void;
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
	onCreateInstance,
	onStartInstance,
	onStopInstance,
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
				<p style={{ marginBottom: '20px', fontSize: '14px' }}>No instances found.</p>
				<button
					onClick={onCreateInstance}
					style={{
						background: '#0e639c',
						color: '#ffffff',
						border: '1px solid #1177bb',
						padding: '10px 20px',
						borderRadius: '2px',
						cursor: 'pointer',
						fontSize: '13px',
						fontFamily: 'var(--vscode-font-family)',
						display: 'inline-flex',
						alignItems: 'center',
						gap: '8px',
						transition: 'all 0.1s ease',
						boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
					}}
					onMouseOver={(e) => {
						e.currentTarget.style.background = '#1177bb';
						e.currentTarget.style.borderColor = '#1890d5';
					}}
					onMouseOut={(e) => {
						e.currentTarget.style.background = '#0e639c';
						e.currentTarget.style.borderColor = '#1177bb';
					}}
					onMouseDown={(e) => {
						e.currentTarget.style.background = '#0d5a8f';
						e.currentTarget.style.transform = 'translateY(1px)';
						e.currentTarget.style.boxShadow = 'none';
					}}
					onMouseUp={(e) => {
						e.currentTarget.style.transform = 'translateY(0)';
					}}
				>
					<span style={{ fontSize: '16px', fontWeight: 'bold', lineHeight: '1' }}>+</span>
					Create New Instance
				</button>
			</div>
		);
	}

	const getStateStyle = (state: string) => {
		const stateLower = state.toLowerCase();
		const baseStyle = {
			padding: '2px 8px',
			borderRadius: '3px',
			fontSize: '10px',
			fontWeight: '600' as const,
			textTransform: 'uppercase' as const,
			letterSpacing: '0.5px',
		};

		if (stateLower === 'running') {
			return { ...baseStyle, background: '#4caf50', color: 'white' };
		} else if (stateLower === 'stopped') {
			return { ...baseStyle, background: '#5a5a5a', color: 'white' };
		} else if (stateLower === 'deleted') {
			return { ...baseStyle, background: '#9e9e9e', color: '#e0e0e0' };
		} else if (stateLower === 'stopping' || stateLower === 'starting' || stateLower === 'creating' || stateLower === 'unknown') {
			// Blinking badge for intermediate/unknown states
			return {
				...baseStyle,
				background: '#ff9800',
				color: 'white',
				animation: 'blink 1s ease-in-out infinite'
			};
		} else {
			// Other transition states
			return {
				...baseStyle,
				background: '#ff9800',
				color: 'white',
				animation: 'pulse 1.5s ease-in-out infinite'
			};
		}
	};

	return (
		<div style={{ padding: '10px' }}>
			<ul style={{ listStyleType: 'none', padding: 0, margin: 0 }}>
				{/* Active Instances */}
				{active.map(instance => {
					const isExpanded = expandedInstance === instance.name;
					const isRunning = instance.state.toLowerCase() === 'running';

					return (
						<li
							key={instance.name}
							style={{
								margin: '6px 0',
								background: 'var(--vscode-editor-background)',
								border: '1px solid var(--vscode-panel-border)',
								borderRadius: '4px',
								overflow: 'hidden',
							}}
						>
							{/* Main instance row - clickable */}
							<div
								onClick={() => isRunning && toggleExpand(instance.name)}
								onContextMenu={(e) => handleContextMenu(e, instance.name, instance.state)}
								style={{
									padding: '10px',
									cursor: isRunning ? 'pointer' : 'default',
									background: 'var(--vscode-editor-background)',
									transition: 'background 0.1s ease',
								}}
								onMouseOver={(e) => {
									if (isRunning) {
										e.currentTarget.style.background = 'var(--vscode-list-hoverBackground)';
									}
								}}
								onMouseOut={(e) => {
									e.currentTarget.style.background = 'var(--vscode-editor-background)';
								}}
							>
								<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
									<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
										{isRunning && (
											<span style={{
												fontSize: '10px',
												color: 'var(--vscode-descriptionForeground)',
												transition: 'transform 0.2s ease',
												transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
												display: 'inline-block',
											}}>
												▶
											</span>
										)}
										<span style={{ fontWeight: '600', color: 'var(--vscode-editor-foreground)', fontSize: '13px' }}>
											{instance.name}
										</span>
									</div>
									<span style={getStateStyle(instance.state)}>
										{instance.state}
									</span>
								</div>
								<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', gap: '8px' }}>
									<div style={{ color: 'var(--vscode-descriptionForeground)', flex: 1, display: 'flex', alignItems: 'center', gap: '4px' }}>
										{/* Ubuntu icon from media/distros folder */}
										{ubuntuIconUri && (
											<img
												src={ubuntuIconUri}
												alt="Ubuntu"
												style={{
													width: '12px',
													height: '12px',
													opacity: 0.8
												}}
											/>
										)}
										<span style={{ fontSize: '10px' }}>{instance.release.replace(/^Ubuntu\s*/i, '')}</span>
									</div>
									<div style={{
										color: 'var(--vscode-descriptionForeground)',
										fontFamily: 'var(--vscode-editor-font-family)',
										flex: 1,
										textAlign: 'right',
										minHeight: '14px'
									}}>
										{instance.state.toLowerCase() === 'stopped' ? '' : (instance.ipv4 || 'No IP')}
									</div>
								</div>
							</div>							{/* Expanded details section */}
							{isExpanded && isRunning && (
								<div style={{
									padding: '12px 10px',
									background: 'var(--vscode-sideBar-background)',
								}}>
									{loadingInfo ? (
										<div style={{
											textAlign: 'center',
											padding: '20px',
											color: 'var(--vscode-descriptionForeground)',
											fontSize: '11px'
										}}>
											Loading details...
										</div>
									) : instanceInfo ? (
										<InstanceDetails
											info={instanceInfo}
											onDelete={onDeleteInstance}
										/>
									) : (
										<div style={{
											textAlign: 'center',
											padding: '20px',
											color: 'var(--vscode-errorForeground)',
											fontSize: '11px'
										}}>
											Failed to load instance details
										</div>
									)}
								</div>
							)}
						</li>
					);
				})}

				{/* Separator for Deleted Instances */}
				{deleted.length > 0 && (
					<>
						<li style={{ display: 'flex', alignItems: 'center', margin: '16px 0', gap: '12px', listStyle: 'none' }}>
							<div style={{ flex: 1, height: '1px', background: 'var(--vscode-panel-border)' }}></div>
							<span style={{ fontSize: '10px', fontWeight: '600', color: 'var(--vscode-descriptionForeground)', letterSpacing: '0.5px' }}>
								DELETED INSTANCES
							</span>
							<div style={{ flex: 1, height: '1px', background: 'var(--vscode-panel-border)' }}></div>
						</li>

						{/* Deleted Instances */}
						{deleted.map(instance => (
							<li
								key={instance.name}
								style={{
									padding: '10px',
									margin: '6px 0',
									opacity: 0.7,
									background: 'var(--vscode-sideBar-background)',
									border: '1px solid var(--vscode-panel-border)',
									borderRadius: '4px',
								}}
							>
								<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
									<span style={{ fontWeight: '600', color: 'var(--vscode-disabledForeground)', fontSize: '13px' }}>
										{instance.name}
									</span>
									<span style={getStateStyle('deleted')}>
										Deleted
									</span>
								</div>
								<div style={{ color: 'var(--vscode-descriptionForeground)', fontSize: '10px' }}>
									{instance.release.replace(/^Ubuntu\s*/i, '')}
								</div>
							</li>
						))}
					</>
				)}
			</ul>

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
					}}
					onClick={(e) => e.stopPropagation()}
				>
					{contextMenu.state.toLowerCase() === 'running' && (
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
					)}
					{contextMenu.state.toLowerCase() === 'stopped' && (
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
					)}
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
							borderTop: contextMenu.state.toLowerCase() !== 'deleted' ? '1px solid var(--vscode-menu-separatorBackground)' : 'none',
							marginTop: contextMenu.state.toLowerCase() !== 'deleted' ? '4px' : '0',
							paddingTop: contextMenu.state.toLowerCase() !== 'deleted' ? '8px' : '6px',
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