import React from 'react';

import type { LaunchOptionsPanelProps } from './types';
import { EmptyHero } from './EmptyHero';
import { QuickInstallButton } from './QuickInstallButton';

const ChevronRight = () => (
	<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
		<path d="M5.25 3.5L8.75 7L5.25 10.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
	</svg>
);

const LaunchOptionRow: React.FC<{
	icon: string;
	label: string;
	description: string;
	onClick: () => void;
}> = ({ icon, label, description, onClick }) => (
	<button
		type="button"
		onClick={onClick}
		style={{
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
		}}
	>
		<span
			style={{
				width: '30px',
				height: '30px',
				borderRadius: '4px',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				background: 'rgba(255,255,255,0.04)',
				color: 'var(--vscode-descriptionForeground)'
			}}
		>
			{icon}
		</span>
		<span>
			<span
				style={{
					display: 'block',
					fontSize: '13px',
					fontWeight: 500,
					color: 'var(--vscode-foreground)',
					lineHeight: 1.25
				}}
			>
				{label}
			</span>
			<span
				style={{
					display: 'block',
					marginTop: '2px',
					fontSize: '12px',
					color: 'var(--vscode-descriptionForeground)',
					lineHeight: 1.25
				}}
			>
				{description}
			</span>
		</span>
		<span style={{ color: 'var(--vscode-descriptionForeground)' }}>
			<ChevronRight />
		</span>
	</button>
);

export const LaunchOptionsPanel: React.FC<LaunchOptionsPanelProps> = ({
	onQuick,
	onCustom,
	onCreateCloudInitInstance,
	onCreateProfileInstance,
	onBack
}) => (
	<div
		style={{
			minHeight: '100vh',
			padding: '24px 30px 36px',
			display: 'flex',
			flexDirection: 'column',
			position: 'relative',
			fontFamily: 'Ubuntu, system-ui, -apple-system, sans-serif',
			background: 'linear-gradient(135deg, transparent 0 58%, rgba(233,84,32,0.16) 58% 100%)'
		}}
	>
		{onBack && (
			<button
				type="button"
				onClick={(event) => {
					event.preventDefault();
					event.stopPropagation();
					onBack();
				}}
				aria-label="Close new instance options"
				title="Close"
				style={{
					position: 'absolute',
					top: '28px',
					right: '28px',
					zIndex: 20,
					width: '28px',
					height: '28px',
					display: 'inline-flex',
					alignItems: 'center',
					justifyContent: 'center',
					background: 'transparent',
					border: 'none',
					color: 'var(--vscode-descriptionForeground)',
					cursor: 'pointer',
					fontSize: '20px',
					lineHeight: 1,
					padding: 0,
					fontFamily: 'Ubuntu, system-ui, -apple-system, sans-serif'
				}}
			>
				x
			</button>
		)}
		<EmptyHero />
		<div style={{ marginBottom: '28px' }}>
			<QuickInstallButton compact onClick={onQuick} />
		</div>

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
				<LaunchOptionRow
					icon="*"
					label="Configure a custom instance"
					description="Pick CPU, RAM, disk, image"
					onClick={onCustom}
				/>
				<LaunchOptionRow
					icon="▣"
					label="Open cloud-init YAML"
					description="Edit, validate, then launch"
					onClick={onCreateCloudInitInstance}
				/>
				<LaunchOptionRow
					icon="□"
					label="Your profiles"
					description="Reusable Multipass configurations"
					onClick={onCreateProfileInstance}
				/>
			</div>
		</div>
	</div>
);
