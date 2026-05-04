import React from 'react';

export interface InstanceContextMenuState {
	x: number;
	y: number;
	instanceName: string;
	state: string;
}

interface InstanceContextMenuProps {
	contextMenu: InstanceContextMenuState;
	onClose: () => void;
	onShellInstance: (name: string) => void;
	onSuspendInstance: (name: string) => void;
	onStopInstance: (name: string) => void;
	onStartInstance: (name: string) => void;
	onStartAndShellInstance: (name: string) => void;
	onRecoverInstance: (name: string) => void;
	onRecoverAndShellInstance: (name: string) => void;
	onPurgeInstance: (name: string) => void;
	onDeleteInstance: (name: string) => void;
	onClearPendingLaunch: (name: string) => void;
}

interface MenuItemProps {
	children: React.ReactNode;
	danger?: boolean;
	separator?: boolean;
	onClick: () => void;
}

const MenuItem: React.FC<MenuItemProps> = ({ children, danger = false, separator = false, onClick }) => (
	<div
		onClick={onClick}
		style={{
			padding: '6px 12px',
			cursor: 'pointer',
			fontSize: '12px',
			color: danger ? 'var(--vscode-errorForeground)' : 'var(--vscode-menu-foreground)',
			display: 'flex',
			alignItems: 'center',
			gap: '8px',
			borderTop: separator ? '1px solid var(--vscode-menu-separatorBackground)' : undefined,
			marginTop: separator ? '4px' : undefined,
			paddingTop: separator ? '8px' : '6px',
		}}
		onMouseOver={(e) => {
			e.currentTarget.style.background = 'var(--vscode-menu-selectionBackground)';
			if (!danger) {
				e.currentTarget.style.color = 'var(--vscode-menu-selectionForeground)';
			}
		}}
		onMouseOut={(e) => {
			e.currentTarget.style.background = 'transparent';
			if (!danger) {
				e.currentTarget.style.color = 'var(--vscode-menu-foreground)';
			}
		}}
	>
		{children}
	</div>
);

export const InstanceContextMenu: React.FC<InstanceContextMenuProps> = ({
	contextMenu,
	onClose,
	onShellInstance,
	onSuspendInstance,
	onStopInstance,
	onStartInstance,
	onStartAndShellInstance,
	onRecoverInstance,
	onRecoverAndShellInstance,
	onPurgeInstance,
	onDeleteInstance,
	onClearPendingLaunch
}) => {
	const state = contextMenu.state.toLowerCase();
	const runAndClose = (action: (name: string) => void) => {
		action(contextMenu.instanceName);
		onClose();
	};

	return (
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
			{state === 'stuck' && (
				<MenuItem onClick={() => runAndClose(onClearPendingLaunch)}>
					Clear pending launch
				</MenuItem>
			)}
			{state === 'running' && (
				<>
					<MenuItem onClick={() => runAndClose(onShellInstance)}>Open Shell</MenuItem>
					<MenuItem onClick={() => runAndClose(onSuspendInstance)}><span>⏸</span> Pause (Suspend)</MenuItem>
					<MenuItem onClick={() => runAndClose(onStopInstance)}><span>⏹</span> Stop Instance</MenuItem>
				</>
			)}
			{(state === 'stopped' || state === 'suspended') && (
				<>
					<MenuItem onClick={() => runAndClose(onStartInstance)}><span>▶</span> Start Instance</MenuItem>
					<MenuItem onClick={() => runAndClose(onStartAndShellInstance)}>Start and Shell</MenuItem>
				</>
			)}
			{state === 'deleted' && (
				<>
					<MenuItem onClick={() => runAndClose(onRecoverInstance)}>Recover Instance</MenuItem>
					<MenuItem onClick={() => runAndClose(onRecoverAndShellInstance)}>Recover and Shell</MenuItem>
					<MenuItem danger separator onClick={() => runAndClose(onPurgeInstance)}>Purge Instance</MenuItem>
				</>
			)}
			{state !== 'deleted' && state !== 'stuck' && (
				<MenuItem danger separator onClick={() => runAndClose(onDeleteInstance)}>
					Delete Instance
				</MenuItem>
			)}
		</div>
	);
};
