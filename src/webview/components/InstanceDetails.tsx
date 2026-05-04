import { getDistributionFont, getMonoFont } from '../utils/fontUtils';

import { MultipassInstanceInfo } from '../../multipassService';
import React from 'react';

interface InstanceDetailsProps {
	info: MultipassInstanceInfo;
	onDelete: (name: string) => void;
	onStart: (name: string) => void;
	onStop: (name: string) => void;
	onSuspend: (name: string) => void;
	onShell: (name: string) => void;
	onSetupSSH: (name: string) => void;
	onRecover: (name: string) => void;
	onPurge: (name: string) => void;
}

// Helper to parse usage strings like "2.34GB out of 4.77GB (49.1%)"
const parseUsage = (usageString: string): { used: string; total: string; percentage: string } | null => {
	const match = usageString.match(/([\d.]+\s*[A-Z]+)\s+out of\s+([\d.]+\s*[A-Z]+)\s+\(([\d.]+)%\)/i);
	if (match) {
		return { used: match[1], total: match[2], percentage: match[3] };
	}
	return null;
};

export const InstanceDetails: React.FC<InstanceDetailsProps> = ({
	info,
	onDelete,
	onStart,
	onStop,
	onSuspend,
	onShell,
	onSetupSSH,
	onRecover,
	onPurge
}) => {
	const distributionFont = getDistributionFont(info.release || '');
	const monoFont = getMonoFont();
	const state = info.state.toLowerCase();
	const isRunning = state === 'running';
	const isStopped = state === 'stopped';
	const isSuspended = state === 'suspended';
	const isDeleted = state === 'deleted';
	const actionButtonStyle: React.CSSProperties = {
		background: 'transparent',
		border: 'none',
		color: 'var(--vscode-descriptionForeground)',
		cursor: 'pointer',
		fontSize: '11px',
		padding: '6px 4px',
		fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
		whiteSpace: 'nowrap'
	};
	const dangerActionStyle: React.CSSProperties = {
		...actionButtonStyle,
		color: 'var(--vscode-errorForeground)'
	};

	// Parse disk and memory usage
	const diskUsage = parseUsage(info.diskUsage);
	const memoryUsage = parseUsage(info.memoryUsage);

	return (
		<div style={{
			marginTop: '0',
			paddingTop: '20px',
			paddingBottom: '8px',
			borderBottom: '1px solid rgba(127,127,127,0.9)',
		}}>
			{/* Metrics Section Header */}
			<div style={{
				fontSize: '9px',
				textTransform: 'uppercase',
				letterSpacing: '1.5px',
				color: 'var(--vscode-descriptionForeground)',
				marginBottom: '24px',
				fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
				fontWeight: '500',
				opacity: 0.7
			}}>
				Metrics
			</div>

			{/* Metrics Grid */}
			<div style={{
				display: 'grid',
				gridTemplateColumns: '1fr 1fr',
				gap: '32px 48px',
				marginBottom: '32px'
			}}>
				{/* CPU */}
				<div>
					<div style={{
						fontSize: '9px',
						color: 'var(--vscode-descriptionForeground)',
						marginBottom: '6px',
						textTransform: 'uppercase',
						letterSpacing: '1px',
						opacity: 0.6,
						fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
					}}>
						CPU
					</div>
					<div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
						<div style={{
							fontSize: '11px',
							fontWeight: '300',
							color: 'var(--vscode-editor-foreground)',
							fontFamily: monoFont,
							letterSpacing: '0.01em'
						}}>
							{info.cpus}
						</div>
						<div style={{
							fontSize: '10px',
							color: 'var(--vscode-descriptionForeground)',
							fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
							opacity: 0.6
						}}>
							cores
						</div>
					</div>
					<div style={{
						marginTop: '4px',
						fontSize: '10px',
						color: 'var(--vscode-descriptionForeground)',
						fontFamily: monoFont,
						opacity: 0.5
					}}>
						load {info.load}
					</div>
				</div>

				{/* Memory */}
				<div>
					<div style={{
						fontSize: '9px',
						color: 'var(--vscode-descriptionForeground)',
						marginBottom: '6px',
						textTransform: 'uppercase',
						letterSpacing: '1px',
						opacity: 0.6,
						fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
					}}>
						Memory
					</div>
					<div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
						<div style={{
							fontSize: '11px',
							fontWeight: '300',
							color: 'var(--vscode-editor-foreground)',
							fontFamily: monoFont,
							letterSpacing: '-0.02em'
						}}>
							{memoryUsage?.used || info.memoryUsage}
						</div>
						{memoryUsage && (
							<div style={{
								fontSize: '10px',
								color: 'var(--vscode-descriptionForeground)',
								fontFamily: monoFont,
								opacity: 0.6,
								letterSpacing: '-0.02em'
							}}>
								/ {memoryUsage.total}
							</div>
						)}
					</div>
				</div>

				{/* Disk */}
				<div>
					<div style={{
						fontSize: '9px',
						color: 'var(--vscode-descriptionForeground)',
						marginBottom: '6px',
						textTransform: 'uppercase',
						letterSpacing: '1px',
						opacity: 0.6,
						fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
					}}>
						Disk
					</div>
					<div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
						<div style={{
							fontSize: '11px',
							fontWeight: '300',
							color: 'var(--vscode-editor-foreground)',
							fontFamily: monoFont,
							letterSpacing: '-0.02em'
						}}>
							{diskUsage?.used || info.diskUsage}
						</div>
						{diskUsage && (
							<div style={{
								fontSize: '10px',
								color: 'var(--vscode-descriptionForeground)',
								fontFamily: monoFont,
								opacity: 0.6,
								letterSpacing: '-0.02em'
							}}>
								/ {diskUsage.total}
							</div>
						)}
					</div>
				</div>

				{/* Zone */}
				<div>
					<div style={{
						fontSize: '9px',
						color: 'var(--vscode-descriptionForeground)',
						marginBottom: '6px',
						textTransform: 'uppercase',
						letterSpacing: '1px',
						opacity: 0.6,
						fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
					}}>
						Zone
					</div>
					<div style={{
						fontSize: '11px',
						color: 'var(--vscode-editor-foreground)',
						fontFamily: distributionFont,
						opacity: 0.7
					}}>
						{info.zone && info.zone !== 'N/A' ? info.zone : '--'}
					</div>
				</div>

				{/* Snapshots */}
				<div>
					<div style={{
						fontSize: '9px',
						color: 'var(--vscode-descriptionForeground)',
						marginBottom: '6px',
						textTransform: 'uppercase',
						letterSpacing: '1px',
						opacity: 0.6,
						fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
					}}>
						Snapshots
					</div>
					<div style={{
						fontSize: '11px',
						color: 'var(--vscode-editor-foreground)',
						fontFamily: monoFont,
						opacity: 0.7
					}}>
						{info.snapshots}
					</div>
				</div>

				{/* Mounts */}
				<div>
					<div style={{
						fontSize: '9px',
						color: 'var(--vscode-descriptionForeground)',
						marginBottom: '6px',
						textTransform: 'uppercase',
						letterSpacing: '1px',
						opacity: 0.6,
						fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
					}}>
						Mounts
					</div>
					<div style={{
						fontSize: '11px',
						color: 'var(--vscode-descriptionForeground)',
						fontFamily: distributionFont,
						opacity: info.mounts ? 0.7 : 0.4
					}}>
						{info.mounts || '—'}
					</div>
				</div>
			</div>

			{/* Actions */}
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					gap: '10px',
					marginBottom: '16px',
					borderTop: '1px solid rgba(127,127,127,0.18)',
					paddingTop: '12px'
				}}
			>
				<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
					{isRunning && (
						<>
							<button type="button" style={actionButtonStyle} title="Suspend instance" onClick={(e) => { e.stopPropagation(); onSuspend(info.name); }}>
								⏸ Pause
							</button>
							<button type="button" style={actionButtonStyle} title="Stop instance" onClick={(e) => { e.stopPropagation(); onStop(info.name); }}>
								⏹ Stop
							</button>
						</>
					)}
					{(isStopped || isSuspended) && (
						<button type="button" style={actionButtonStyle} title={isSuspended ? 'Resume instance' : 'Start instance'} onClick={(e) => { e.stopPropagation(); onStart(info.name); }}>
							▶ {isSuspended ? 'Resume' : 'Start'}
						</button>
					)}
					{isDeleted && (
						<button type="button" style={actionButtonStyle} title="Recover instance" onClick={(e) => { e.stopPropagation(); onRecover(info.name); }}>
							↩ Recover
						</button>
					)}
				</div>

				<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
					{!isDeleted && (
						<>
							<button type="button" style={actionButtonStyle} title="Open shell" onClick={(e) => { e.stopPropagation(); onShell(info.name); }}>
								💻 Shell
							</button>
							<button type="button" style={actionButtonStyle} title="Set up Remote-SSH" onClick={(e) => { e.stopPropagation(); onSetupSSH(info.name); }}>
								🔗 SSH
							</button>
						</>
					)}
				</div>

				<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
					<button
						type="button"
						style={dangerActionStyle}
						title={isDeleted ? 'Purge instance permanently' : 'Delete instance'}
						onClick={(e) => {
							e.stopPropagation();
							if (isDeleted) {
								onPurge(info.name);
							} else {
								onDelete(info.name);
							}
						}}
						onMouseOver={(e) => {
							e.currentTarget.style.textDecoration = 'underline';
						}}
						onMouseOut={(e) => {
							e.currentTarget.style.textDecoration = 'none';
						}}
					>
						{isDeleted ? 'Purge' : 'Delete'}
					</button>
				</div>
			</div>
		</div>
	);
};
