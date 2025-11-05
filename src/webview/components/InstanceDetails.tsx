import { MultipassInstanceInfo } from '../../multipassService';
import React from 'react';

interface InstanceDetailsProps {
	info: MultipassInstanceInfo;
	onDelete: (name: string) => void;
}

export const InstanceDetails: React.FC<InstanceDetailsProps> = ({ info, onDelete }) => {
	const detailRows = [
		{ label: 'Zone', value: info.zone },
		{ label: 'Snapshots', value: info.snapshots.toString() },
		{ label: 'CPU(s)', value: info.cpus },
		{ label: 'Load', value: info.load },
		{ label: 'Disk Usage', value: info.diskUsage },
		{ label: 'Memory Usage', value: info.memoryUsage },
		{ label: 'Mounts', value: info.mounts }
	];

	return (
		<div style={{
			marginTop: '8px',
			paddingTop: '12px',
			borderTop: '1px solid var(--vscode-panel-border)',
		}}>
			{/* Detail rows */}
			<div style={{ marginBottom: '12px' }}>
				{detailRows.map((row, index) => (
					<div
						key={index}
						style={{
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'center',
							fontSize: '11px',
							padding: '4px 0',
						}}
					>
						<span style={{
							color: 'var(--vscode-descriptionForeground)',
							fontWeight: '600'
						}}>
							{row.label}:
						</span>
						<span style={{
							color: 'var(--vscode-editor-foreground)',
							textAlign: 'right',
							maxWidth: '60%',
							wordBreak: 'break-word'
						}}>
							{row.value}
						</span>
					</div>
				))}
			</div>

			{/* Separator */}
			<div style={{
				borderTop: '1px solid var(--vscode-panel-border)',
				margin: '12px 0'
			}}></div>

			{/* Delete button */}
			<button
				onClick={(e) => {
					e.stopPropagation();
					console.log('Delete button clicked for instance:', info.name);
					// Remove confirmation here - let the extension handle it
					onDelete(info.name);
				}}
				style={{
					width: '100%',
					padding: '8px 16px',
					background: '#c74440',
					color: '#ffffff',
					border: '1px solid #a93c38',
					borderRadius: '2px',
					cursor: 'pointer',
					fontSize: '11px',
					fontFamily: 'var(--vscode-font-family)',
					fontWeight: '500',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					gap: '8px',
					transition: 'all 0.1s ease',
				}}
				onMouseOver={(e) => {
					e.currentTarget.style.background = '#a93c38';
					e.currentTarget.style.borderColor = '#8b322f';
				}}
				onMouseOut={(e) => {
					e.currentTarget.style.background = '#c74440';
					e.currentTarget.style.borderColor = '#a93c38';
				}}
			>
				<svg
					style={{ width: '14px', height: '14px' }}
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
					/>
				</svg>
				Delete Instance
			</button>
		</div>
	);
};
