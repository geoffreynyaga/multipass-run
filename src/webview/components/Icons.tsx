import React from 'react';

export const VmIcon: React.FC<{ size?: number }> = ({ size = 28 }) => (
	<svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
		<rect x="2" y="3" width="12" height="8" rx="1" />
		<path d="M5 14h6M8 11v3" />
	</svg>
);

export const ShellIcon: React.FC<{ size?: number }> = ({ size = 12 }) => (
	<svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
		<path d="M3 5l3 3-3 3M8 12h5" />
	</svg>
);

export const CopyIcon: React.FC<{ size?: number }> = ({ size = 12 }) => (
	<svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
		<rect x="5" y="5" width="9" height="9" rx="1.2" />
		<path d="M3 11V3a1 1 0 0 1 1-1h7" />
	</svg>
);

export const ExternalLinkIcon: React.FC<{ size?: number }> = ({ size = 12 }) => (
	<svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
		<path d="M6 4H3.5A1.5 1.5 0 0 0 2 5.5v7A1.5 1.5 0 0 0 3.5 14h7a1.5 1.5 0 0 0 1.5-1.5V10" />
		<path d="M9 2h5v5M8 8l6-6" />
	</svg>
);
