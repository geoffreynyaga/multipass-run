import { getMonoFont } from '../utils/fontUtils';

import { MultipassInstanceInfo } from '../../multipassService';
import React from 'react';

interface InstanceDetailsProps {
	info: MultipassInstanceInfo;
	currentState?: string;
	onDelete: (name: string) => void;
	onStart: (name: string) => void;
	onStop: (name: string) => void;
	onSuspend: (name: string) => void;
	onShell: (name: string) => void;
	onSetupSSH: (name: string) => void;
	onRecover: (name: string) => void;
	onPurge: (name: string) => void;
}

type PendingAction = 'starting' | 'stopping' | 'suspending' | null;

const UI_FONT = 'Inter, system-ui, -apple-system, sans-serif';
const DIM = 'var(--vscode-descriptionForeground)';
const FG = 'var(--vscode-editor-foreground)';
const DANGER = 'var(--vscode-errorForeground)';

const eyebrow: React.CSSProperties = {
	fontSize: '9px',
	textTransform: 'uppercase',
	letterSpacing: '1.2px',
	color: DIM,
	fontFamily: UI_FONT,
	fontWeight: 500,
	opacity: 0.7
};

const Divider: React.FC = () => (
	<hr style={{
		height: 1,
		background: 'rgba(127,127,127,0.18)',
		border: 0,
		margin: 0
	}} />
);

const ActionBtn: React.FC<{
	primary?: boolean;
	onClick: (e: React.MouseEvent) => void;
	title: string;
	flex?: boolean;
	children: React.ReactNode;
}> = ({ primary, onClick, title, flex, children }) => {
	const [hover, setHover] = React.useState(false);
	const base: React.CSSProperties = {
		display: 'inline-flex',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 6,
		padding: '6px 10px',
		fontSize: 11,
		fontFamily: UI_FONT,
		fontWeight: 500,
		borderRadius: 3,
		border: '1px solid',
		cursor: 'pointer',
		flex: flex ? 1 : undefined,
		lineHeight: 1.2,
		whiteSpace: 'nowrap',
		transition: 'background 0.12s, border-color 0.12s'
	};
	const style: React.CSSProperties = primary
		? {
			...base,
			background: hover ? '#C7401A' : '#E95420',
			borderColor: hover ? '#C7401A' : '#E95420',
			color: '#fff'
		}
		: {
			...base,
			background: hover ? 'rgba(127,127,127,0.12)' : 'transparent',
			borderColor: 'rgba(127,127,127,0.35)',
			color: FG
		};
	return (
		<button
			type="button"
			title={title}
			onClick={onClick}
			onMouseEnter={() => setHover(true)}
			onMouseLeave={() => setHover(false)}
			style={style}
		>
			{children}
		</button>
	);
};

const ShellIcon: React.FC<{ size?: number }> = ({ size = 12 }) => (
	<svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
		<path d="M3 4l3 3-3 3M8 11h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
	</svg>
);
const LinkIcon: React.FC<{ size?: number }> = ({ size = 11 }) => (
	<svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
		<path d="M6.5 9.5l3-3M5.5 11.5l-1 1a2.12 2.12 0 0 1-3-3l2-2a2.12 2.12 0 0 1 3 0M10.5 4.5l1-1a2.12 2.12 0 0 1 3 3l-2 2a2.12 2.12 0 0 1-3 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
	</svg>
);
const StopIcon: React.FC<{ size?: number }> = ({ size = 11 }) => (
	<svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
		<rect x="3" y="3" width="10" height="10" rx="1" />
	</svg>
);
const PauseIcon: React.FC<{ size?: number }> = ({ size = 11 }) => (
	<svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
		<rect x="4" y="3" width="3" height="10" rx="1" />
		<rect x="9" y="3" width="3" height="10" rx="1" />
	</svg>
);
const PlayIcon: React.FC<{ size?: number }> = ({ size = 11 }) => (
	<svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
		<path d="M4 3l9 5-9 5V3z" />
	</svg>
);
const PlusIcon: React.FC<{ size?: number }> = ({ size = 11 }) => (
	<svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
		<path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
	</svg>
);
const CamIcon: React.FC<{ size?: number }> = ({ size = 12 }) => (
	<svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
		<path d="M2 5.5h2.5L6 4h4l1.5 1.5H14V12H2V5.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
		<circle cx="8" cy="8.7" r="2.1" stroke="currentColor" strokeWidth="1.2" />
	</svg>
);
const ArrowIcon: React.FC<{ size?: number }> = ({ size = 9 }) => (
	<svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
		<path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
	</svg>
);
const Spinner: React.FC<{ size?: number }> = ({ size = 12 }) => (
	<svg
		width={size}
		height={size}
		viewBox="0 0 16 16"
		fill="none"
		aria-hidden="true"
		style={{ animation: 'mp-spin 0.9s linear infinite' }}
	>
		<circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.6" strokeOpacity="0.25" />
		<path d="M14 8a6 6 0 0 0-6-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
	</svg>
);

const SectionHeader: React.FC<{
	label: string;
	count?: number;
	action?: React.ReactNode;
}> = ({ label, count, action }) => (
	<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
		<span style={eyebrow}>
			{label}
			{count !== undefined && count > 0 && (
				<span style={{ marginLeft: 6, opacity: 0.85 }}>· {count}</span>
			)}
		</span>
		{action}
	</div>
);

const GhostIconBtn: React.FC<{
	title: string;
	onClick: (e: React.MouseEvent) => void;
	children: React.ReactNode;
}> = ({ title, onClick, children }) => {
	const [hover, setHover] = React.useState(false);
	return (
		<button
			type="button"
			title={title}
			onClick={onClick}
			onMouseEnter={() => setHover(true)}
			onMouseLeave={() => setHover(false)}
			style={{
				background: hover ? 'rgba(127,127,127,0.12)' : 'transparent',
				border: 'none',
				color: hover ? FG : DIM,
				cursor: 'pointer',
				padding: '2px 5px',
				borderRadius: 3,
				display: 'inline-flex',
				alignItems: 'center',
				gap: 4,
				fontSize: 11,
				fontFamily: UI_FONT
			}}
		>
			{children}
		</button>
	);
};

export const InstanceDetails: React.FC<InstanceDetailsProps> = ({
	info,
	currentState,
	onDelete,
	onStart,
	onStop,
	onSuspend,
	onShell,
	onSetupSSH,
	onRecover,
	onPurge
}) => {
	const monoFont = getMonoFont();
	const [pending, setPending] = React.useState<PendingAction>(null);
	const authoritativeState = (currentState || info.state || '').toLowerCase();

	// Clear pending once authoritative state resolves to a stable target
	React.useEffect(() => {
		if (!pending) return;
		if (pending === 'starting' && authoritativeState === 'running') setPending(null);
		else if (pending === 'stopping' && authoritativeState === 'stopped') setPending(null);
		else if (pending === 'suspending' && authoritativeState === 'suspended') setPending(null);
	}, [pending, authoritativeState]);

	// Effective state for UI: pending overrides
	const effectiveState = pending
		? (pending === 'starting' ? 'starting' : pending === 'stopping' ? 'stopping' : 'suspending')
		: authoritativeState;

	const isTransitioning = pending !== null || effectiveState === 'starting' || effectiveState === 'stopping' || effectiveState === 'suspending';
	const isRunning = effectiveState === 'running';
	const isStopped = effectiveState === 'stopped';
	const isSuspended = effectiveState === 'suspended';
	const isDeleted = effectiveState === 'deleted';
	const showMetrics = isRunning && !isTransitioning;

	const transitionLabel = effectiveState === 'starting' ? 'Starting…'
		: effectiveState === 'stopping' ? 'Stopping…'
		: effectiveState === 'suspending' ? 'Suspending…'
		: '';

	const stop = (e: React.MouseEvent) => e.stopPropagation();

	const kvRow = (label: string, value: React.ReactNode, dim = false): React.ReactNode => (
		<>
			<span style={{ color: DIM, fontFamily: UI_FONT, fontSize: 11 }}>{label}</span>
			<span style={{
				color: dim ? DIM : FG,
				fontFamily: monoFont,
				fontSize: 11.5
			}}>{value}</span>
		</>
	);

	const cpuValue = `${info.cpus || '--'}c${info.load && info.load !== 'N/A' ? ` · load ${String(info.load).split(' ')[0]}` : ''}`;
	const mountsList = info.mountsList ?? [];

	return (
		<div style={{
			padding: 0,
			borderBottom: '1px solid rgba(127,127,127,0.9)'
		}}>
			<style>{`@keyframes mp-spin { to { transform: rotate(360deg); } }`}</style>
			{/* Action bar */}
			{!isDeleted && (
				<div style={{
					padding: '10px 14px',
					display: 'flex',
					gap: 6,
					borderBottom: '1px solid rgba(127,127,127,0.18)',
					alignItems: 'center'
				}}>
					{isTransitioning ? (
						<div style={{
							flex: 1,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							gap: 8,
							padding: '8px 10px',
							fontSize: 12,
							fontFamily: UI_FONT,
							color: DIM,
							border: '1px dashed rgba(127,127,127,0.35)',
							borderRadius: 3
						}}>
							<Spinner /> {transitionLabel}
						</div>
					) : (
						<>
							{isRunning && (
								<ActionBtn primary flex onClick={(e) => { stop(e); onShell(info.name); }} title="Open shell">
									<ShellIcon /> Shell
								</ActionBtn>
							)}
							{(isStopped || isSuspended) && (
								<ActionBtn primary flex onClick={(e) => {
									stop(e);
									setPending('starting');
									onStart(info.name);
								}} title={isSuspended ? 'Resume' : 'Start'}>
									<PlayIcon /> {isSuspended ? 'Resume' : 'Start'}
								</ActionBtn>
							)}
							{isRunning && (
								<ActionBtn onClick={(e) => { stop(e); onSetupSSH(info.name); }} title="Set up Remote-SSH">
									<LinkIcon /> SSH
								</ActionBtn>
							)}
							{isRunning && (
								<>
									<ActionBtn onClick={(e) => {
										stop(e);
										setPending('stopping');
										onStop(info.name);
									}} title="Stop instance">
										<StopIcon />
									</ActionBtn>
									<ActionBtn onClick={(e) => {
										stop(e);
										setPending('suspending');
										onSuspend(info.name);
									}} title="Suspend instance">
										<PauseIcon />
									</ActionBtn>
								</>
							)}
						</>
					)}
				</div>
			)}

			{/* Dense KV grid — only when running with live data */}
			{showMetrics && (
				<>
					<div style={{ padding: '12px 14px' }}>
						<div style={{
							display: 'grid',
							gridTemplateColumns: '70px 1fr',
							rowGap: 5,
							columnGap: 10,
							alignItems: 'baseline'
						}}>
							{kvRow('CPU', cpuValue)}
							{kvRow('Memory', info.memoryUsage)}
							{kvRow('Disk', info.diskUsage)}
							{info.ipv4 && kvRow('IP', info.ipv4)}
							{kvRow('Zone', info.zone && info.zone !== 'N/A' ? info.zone : '--', !(info.zone && info.zone !== 'N/A'))}
						</div>
					</div>
					<Divider />
				</>
			)}

			{/* Mounts */}
			<div style={{ padding: '10px 14px' }}>
				<SectionHeader
					label="Mounts"
					count={mountsList.length}
					action={
						<GhostIconBtn title="Add mount" onClick={stop}>
							<PlusIcon />
						</GhostIconBtn>
					}
				/>
				{mountsList.length === 0 ? (
					<div style={{ fontSize: 11, color: DIM, fontFamily: UI_FONT, opacity: 0.7 }}>
						None mounted
					</div>
				) : (
					<div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
						{mountsList.map((m, i) => (
							<div key={i} style={{
								display: 'flex',
								alignItems: 'center',
								gap: 6,
								fontSize: 11,
								fontFamily: monoFont,
								color: FG,
								flexWrap: 'wrap'
							}}>
								<span style={{ color: DIM }}>{m.source}</span>
								<span style={{ color: DIM, display: 'inline-flex' }}><ArrowIcon /></span>
								<span>{m.target}</span>
							</div>
						))}
					</div>
				)}
			</div>

			<Divider />

			{/* Snapshots */}
			<div style={{ padding: '10px 14px' }}>
				<SectionHeader
					label="Snapshots"
					count={info.snapshots}
					action={
						<GhostIconBtn title="Take snapshot" onClick={stop}>
							<CamIcon />
						</GhostIconBtn>
					}
				/>
				<div style={{ fontSize: 11, color: DIM, fontFamily: UI_FONT, opacity: 0.7 }}>
					{info.snapshots === 0 ? 'No snapshots' : `${info.snapshots} snapshot${info.snapshots === 1 ? '' : 's'}`}
				</div>
			</div>

			<Divider />

			{/* Delete / Recover-Purge */}
			<div style={{ padding: '10px 14px 12px' }}>
				{isDeleted ? (
					<div style={{ display: 'flex', gap: 6 }}>
						<ActionBtn flex onClick={(e) => { stop(e); onRecover(info.name); }} title="Recover instance">
							Recover
						</ActionBtn>
						<button
							type="button"
							onClick={(e) => { stop(e); onPurge(info.name); }}
							style={{
								background: 'transparent',
								border: 'none',
								color: DANGER,
								cursor: 'pointer',
								fontSize: 11.5,
								fontFamily: UI_FONT,
								fontWeight: 500,
								padding: '6px 10px'
							}}
							onMouseOver={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
							onMouseOut={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
						>
							Purge permanently
						</button>
					</div>
				) : (
					<button
						type="button"
						onClick={(e) => { stop(e); onDelete(info.name); }}
						style={{
							background: 'transparent',
							border: 'none',
							color: DANGER,
							cursor: 'pointer',
							fontSize: 12,
							fontFamily: UI_FONT,
							fontWeight: 500,
							padding: 0
						}}
						onMouseOver={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
						onMouseOut={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
					>
						Delete instance
					</button>
				)}
			</div>
		</div>
	);
};
