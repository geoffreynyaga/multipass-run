import React from 'react';

export const EmptyHero: React.FC = () => (
	<div style={{ width: '100%', maxWidth: '320px', paddingTop: '56px' }}>
		<div
			aria-hidden="true"
			style={{
				width: '58px',
				height: '58px',
				borderRadius: '50%',
				background: 'linear-gradient(135deg, #ff7336, #e95420)',
				margin: '0 0 24px',
				boxShadow: '0 10px 24px rgba(233,84,32,0.24)'
			}}
		/>
		<h2
			style={{
				fontSize: '24px',
				lineHeight: 1.45,
				fontWeight: 600,
				margin: '0 0 12px',
				color: 'var(--vscode-foreground)',
				letterSpacing: 0
			}}
		>
			Your pocket cloud,<br />right in VS Code.
		</h2>
		<p
			style={{
				margin: '0 0 24px',
				fontSize: '14px',
				color: 'var(--vscode-descriptionForeground)',
				lineHeight: 1.5,
				fontWeight: 400
			}}
		>
			Spin up Multipass Ubuntu VMs with cloud-init, mounts, and SSH when you need them.
		</p>
	</div>
);
