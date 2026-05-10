import { getMonoFont } from '../utils/fontUtils';

import { MultipassInstanceInfo, MultipassSnapshot } from '../../multipassService';
import React from 'react';

interface InstanceDetailsProps {
	info: MultipassInstanceInfo;
	currentState?: string;
	snapshots: MultipassSnapshot[];
	onDelete: (name: string) => void;
	onStart: (name: string) => void;
	onStop: (name: string) => void;
	onSuspend: (name: string) => void;
	onShell: (name: string) => void;
	onSetupSSH: (name: string) => void;
	onRecover: (name: string) => void;
	onPurge: (name: string) => void;
	onTakeSnapshot: (name: string, snapshotName?: string, comment?: string) => void;
	onRestoreSnapshot: (name: string, snapshotName: string) => void;
	onDeleteSnapshot: (name: string, snapshotName: string) => void;
	onAddMount: (name: string) => void;
	onRemoveMount: (name: string, guestPath: string) => void;
	hostPlatform: string;
	onOpenFullDiskAccessSettings: () => void;
}

const MONTHS: Record<string, number> = {
	Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
	Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
};

function parseMultipassDate(created: string): Date | null {
	if (!created) return null;
	// First try native parse — covers ISO and some locale strings.
	const native = new Date(created);
	if (!isNaN(native.getTime())) return native;
	// Multipass format: "Sun May 10 16:18:11 2026 CEST"
	const m = created.match(/^[A-Za-z]{3}\s+([A-Za-z]{3})\s+(\d{1,2})\s+(\d{1,2}):(\d{2}):(\d{2})\s+(\d{4})/);
	if (!m) return null;
	const month = MONTHS[m[1]];
	if (month === undefined) return null;
	return new Date(
		parseInt(m[6], 10),
		month,
		parseInt(m[2], 10),
		parseInt(m[3], 10),
		parseInt(m[4], 10),
		parseInt(m[5], 10)
	);
}

function formatRelativeTime(created: string): string {
	const date = parseMultipassDate(created);
	if (!date) return created;
	const diffMs = Date.now() - date.getTime();
	const min = Math.floor(diffMs / 60000);
	if (min < 1) return 'just now';
	if (min < 60) return `${min}m ago`;
	const hr = Math.floor(min / 60);
	if (hr < 24) return `${hr}h ago`;
	const day = Math.floor(hr / 24);
	if (day < 30) return `${day}d ago`;
	const mo = Math.floor(day / 30);
	if (mo < 12) return `${mo}mo ago`;
	return `${Math.floor(mo / 12)}y ago`;
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

interface SnapshotSectionProps {
	instanceName: string;
	snapshots: MultipassSnapshot[];
	canTake: boolean;
	canRestore: boolean;
	onTake: (name: string, snapshotName?: string, comment?: string) => void;
	onRestore: (name: string, snapshotName: string) => void;
	onDelete: (name: string, snapshotName: string) => void;
	monoFont: string;
}

const SnapshotSection: React.FC<SnapshotSectionProps> = ({
	instanceName,
	snapshots,
	canTake,
	canRestore,
	onTake,
	onRestore,
	onDelete,
	monoFont
}) => {
	const [showForm, setShowForm] = React.useState(false);
	const [snapName, setSnapName] = React.useState('');
	const [snapComment, setSnapComment] = React.useState('');

	const stop = (e: React.MouseEvent) => e.stopPropagation();

	const submit = (e: React.MouseEvent | React.FormEvent) => {
		e.preventDefault();
		e.stopPropagation();
		onTake(instanceName, snapName.trim() || undefined, snapComment.trim() || undefined);
		setSnapName('');
		setSnapComment('');
		setShowForm(false);
	};

	const inputStyle: React.CSSProperties = {
		background: 'var(--vscode-input-background)',
		color: 'var(--vscode-input-foreground)',
		border: '1px solid var(--vscode-input-border, rgba(127,127,127,0.35))',
		borderRadius: 3,
		padding: '5px 8px',
		fontSize: 11,
		fontFamily: UI_FONT,
		width: '100%',
		boxSizing: 'border-box'
	};

	return (
		<div style={{ padding: '10px 14px' }}>
			<SectionHeader
				label="Snapshots"
				count={snapshots.length}
				action={
					canTake ? (
						<GhostIconBtn
							title={showForm ? 'Cancel' : 'Take snapshot'}
							onClick={(e) => { stop(e); setShowForm((v) => !v); }}
						>
							{showForm ? <span style={{ fontSize: 14, lineHeight: 1 }}>×</span> : <CamIcon />}
						</GhostIconBtn>
					) : (
						<span style={{ fontSize: 10, color: DIM, opacity: 0.7, fontFamily: UI_FONT }} title="Stop the instance to take a snapshot">
							stop instance to snapshot
						</span>
					)
				}
			/>

			{showForm && canTake && (
				<form onSubmit={submit} onClick={stop} style={{
					display: 'flex',
					flexDirection: 'column',
					gap: 6,
					padding: '8px 0 10px',
					borderBottom: '1px solid rgba(127,127,127,0.18)',
					marginBottom: 8
				}}>
					<input
						type="text"
						value={snapName}
						onChange={(e) => setSnapName(e.target.value)}
						placeholder="Name (optional)"
						style={inputStyle}
						autoFocus
					/>
					<input
						type="text"
						value={snapComment}
						onChange={(e) => setSnapComment(e.target.value)}
						placeholder="Comment (optional)"
						style={inputStyle}
					/>
					<div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
						<button
							type="button"
							onClick={(e) => { stop(e); setShowForm(false); setSnapName(''); setSnapComment(''); }}
							style={{
								background: 'transparent',
								border: '1px solid rgba(127,127,127,0.35)',
								color: FG,
								borderRadius: 3,
								padding: '5px 10px',
								fontSize: 11,
								fontFamily: UI_FONT,
								cursor: 'pointer'
							}}
						>
							Cancel
						</button>
						<button
							type="submit"
							style={{
								background: '#E95420',
								border: '1px solid #E95420',
								color: '#fff',
								borderRadius: 3,
								padding: '5px 10px',
								fontSize: 11,
								fontFamily: UI_FONT,
								fontWeight: 500,
								cursor: 'pointer'
							}}
						>
							Take snapshot
						</button>
					</div>
				</form>
			)}

			{snapshots.length === 0 ? (
				<div style={{ fontSize: 11, color: DIM, fontFamily: UI_FONT, opacity: 0.7 }}>
					No snapshots
				</div>
			) : (
				<div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
					{snapshots.map((s) => {
						const meta: React.ReactNode[] = [];
						const rel = formatRelativeTime(s.created);
						if (rel) meta.push(<span key="time">{rel}</span>);
						if (s.comment) meta.push(<span key="comment">{s.comment}</span>);
						if (s.parent) meta.push(
							<span key="parent">
								parent <span style={{ fontFamily: monoFont }}>{s.parent}</span>
							</span>
						);
						return (
							<div key={s.name} style={{
								display: 'flex',
								flexDirection: 'column',
								gap: 6,
								minWidth: 0
							}}>
								<div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
									<span style={{
										flex: 1,
										minWidth: 0,
										fontFamily: monoFont,
										fontSize: 12,
										color: FG,
										overflow: 'hidden',
										textOverflow: 'ellipsis',
										whiteSpace: 'nowrap'
									}} title={s.name}>{s.name}</span>
									<button
										type="button"
										title={canRestore ? `Restore ${s.name}` : 'Stop instance to restore'}
										disabled={!canRestore}
										onClick={(e) => { stop(e); onRestore(instanceName, s.name); }}
										style={{
											background: 'transparent',
											border: 'none',
											color: canRestore ? FG : DIM,
											cursor: canRestore ? 'pointer' : 'not-allowed',
											fontSize: 11,
											fontFamily: UI_FONT,
											padding: '2px 6px',
											opacity: canRestore ? 1 : 0.5,
											flex: 'none'
										}}
									>Restore</button>
									<button
										type="button"
										title={`Delete ${s.name}`}
										onClick={(e) => { stop(e); onDelete(instanceName, s.name); }}
										style={{
											background: 'transparent',
											border: 'none',
											color: DANGER,
											cursor: 'pointer',
											fontSize: 11,
											fontFamily: UI_FONT,
											padding: '2px 6px',
											flex: 'none'
										}}
									>Delete</button>
								</div>
								{meta.length > 0 && (
									<div style={{
										fontSize: 10.5,
										color: DIM,
										fontFamily: UI_FONT,
										opacity: 0.85,
										display: 'flex',
										gap: 6,
										flexWrap: 'wrap',
										lineHeight: 1.4
									}}>
										{meta.map((node, i) => (
											<React.Fragment key={i}>
												{i > 0 && <span style={{ opacity: 0.5 }}>·</span>}
												{node}
											</React.Fragment>
										))}
									</div>
								)}
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
};

export const InstanceDetails: React.FC<InstanceDetailsProps> = ({
	info,
	currentState,
	snapshots,
	onDelete,
	onStart,
	onStop,
	onSuspend,
	onShell,
	onSetupSSH,
	onRecover,
	onPurge,
	onTakeSnapshot,
	onRestoreSnapshot,
	onDeleteSnapshot,
	onAddMount,
	onRemoveMount,
	hostPlatform,
	onOpenFullDiskAccessSettings
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
						!isDeleted && (
							<GhostIconBtn
								title="Add mount"
								onClick={(e) => { stop(e); onAddMount(info.name); }}
							>
								<PlusIcon />
							</GhostIconBtn>
						)
					}
				/>
				{hostPlatform === 'darwin' && !isDeleted && (
					<div style={{
						fontSize: 10.5,
						color: DIM,
						fontFamily: UI_FONT,
						lineHeight: 1.4,
						marginBottom: 8,
						padding: '6px 8px',
						background: 'rgba(127,127,127,0.08)',
						border: '1px solid rgba(127,127,127,0.18)',
						borderRadius: 3
					}}>
						<span>macOS: empty mount? grant </span>
						<a
							href="#"
							onClick={(e) => { e.preventDefault(); stop(e); onOpenFullDiskAccessSettings(); }}
							style={{ color: '#E95420', textDecoration: 'none' }}
						>Full Disk Access</a>
						<span> to multipassd, then restart daemon and remount.</span>
					</div>
				)}
				{mountsList.length === 0 ? (
					<div style={{ fontSize: 11, color: DIM, fontFamily: UI_FONT, opacity: 0.7 }}>
						None mounted
					</div>
				) : (
					<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
						{mountsList.map((m, i) => (
							<div key={i} style={{
								display: 'flex',
								alignItems: 'center',
								gap: 6,
								minWidth: 0
							}}>
								<div style={{
									flex: 1,
									minWidth: 0,
									display: 'flex',
									flexDirection: 'column',
									gap: 2,
									fontFamily: monoFont,
									fontSize: 11,
									color: FG
								}}>
									<span style={{
										color: DIM,
										overflow: 'hidden',
										textOverflow: 'ellipsis',
										whiteSpace: 'nowrap'
									}} title={m.source}>{m.source}</span>
									<span style={{
										display: 'flex',
										alignItems: 'center',
										gap: 4,
										overflow: 'hidden',
										textOverflow: 'ellipsis',
										whiteSpace: 'nowrap'
									}} title={m.target}>
										<ArrowIcon />
										<span style={{
											overflow: 'hidden',
											textOverflow: 'ellipsis',
											whiteSpace: 'nowrap'
										}}>{m.target}</span>
									</span>
								</div>
								{!isDeleted && (
									<button
										type="button"
										title={`Unmount ${m.target}`}
										onClick={(e) => { stop(e); onRemoveMount(info.name, m.target); }}
										style={{
											background: 'transparent',
											border: 'none',
											color: DANGER,
											cursor: 'pointer',
											fontSize: 11,
											fontFamily: UI_FONT,
											padding: '2px 6px',
											flex: 'none'
										}}
									>Unmount</button>
								)}
							</div>
						))}
					</div>
				)}
			</div>

			{!isDeleted && (
				<>
					<Divider />
					<SnapshotSection
						instanceName={info.name}
						snapshots={snapshots}
						canTake={isStopped}
						canRestore={isStopped}
						onTake={onTakeSnapshot}
						onRestore={onRestoreSnapshot}
						onDelete={onDeleteSnapshot}
						monoFont={monoFont}
					/>
				</>
			)}

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
