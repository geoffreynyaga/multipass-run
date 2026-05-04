import React from 'react';

export const QuickInstallButton: React.FC<{ onClick: () => void; compact?: boolean }> = ({ onClick, compact = false }) => (
	<button
		type="button"
		onClick={onClick}
		style={{
			background: '#E95420',
			color: '#ffffff',
			border: 'none',
			borderRadius: '3px',
			padding: compact ? '11px 18px' : '13px 28px',
			cursor: 'pointer',
			fontSize: compact ? '13px' : '14px',
			fontWeight: 600,
			fontFamily: 'Ubuntu, system-ui, -apple-system, sans-serif',
			display: compact ? 'inline-flex' : undefined,
			alignItems: compact ? 'center' : undefined,
			justifyContent: compact ? 'center' : undefined,
			gap: compact ? '8px' : undefined,
			minHeight: compact ? '40px' : '48px',
			width: '100%'
		}}
		onMouseOver={(e) => {
			e.currentTarget.style.background = '#C7401A';
		}}
		onMouseOut={(e) => {
			e.currentTarget.style.background = '#E95420';
		}}
	>
		{compact && <span style={{ fontSize: '18px', lineHeight: 1 }}>+</span>}
		<span>Quick install LTS</span>
	</button>
);
