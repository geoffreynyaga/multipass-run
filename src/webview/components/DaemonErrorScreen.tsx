import React from 'react';

interface DaemonErrorScreenProps {
	onRefresh: () => void;
}

export const DaemonErrorScreen: React.FC<DaemonErrorScreenProps> = ({ onRefresh }) => (
	<div
		className="flex flex-col items-center justify-evenly min-h-[300px] px-6 py-12"
		style={{ fontFamily: 'Ubuntu, system-ui, -apple-system, sans-serif' }}
	>
		{/* Icon */}
		<div className="mb-6">
			<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
				<circle cx="24" cy="24" r="20" stroke="#E95420" strokeWidth="2" fill="none"/>
				<path d="M18 18L30 30M30 18L18 30" stroke="#E95420" strokeWidth="2" strokeLinecap="round"/>
			</svg>
		</div>

		<h2
			className="mb-3 text-xl font-light"
			style={{ color: 'var(--vscode-foreground)', fontFamily: 'Ubuntu, system-ui, -apple-system, sans-serif' }}
		>
			Multipass Daemon Not Running
		</h2>

		<p
			className="max-w-md mb-8 text-sm leading-relaxed text-center"
			style={{ color: 'var(--vscode-descriptionForeground)' }}
		>
			Multipass is installed but the daemon is not running. Please start Multipass from
			your Applications folder or system tray.
		</p>

		<div className="flex flex-col w-full max-w-xs" style={{ gap: '12px' }}>
			<button
				onClick={onRefresh}
				className="w-full bg-[#E95420] text-white text-sm font-normal rounded-sm hover:bg-[#C73E1A] transition-colors"
				style={{ padding: '10px 24px' }}
			>
				Refresh
			</button>
		</div>
	</div>
);
