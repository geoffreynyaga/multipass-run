import React from 'react';

import type { EmptyInstanceStateProps } from './types';
import { EmptyHero } from './EmptyHero';
import { InlineLaunchForm } from './InlineLaunchForm';
import { LaunchOptionsPanel } from './LaunchOptionsPanel';
import { QuickInstallButton } from './QuickInstallButton';

export { InlineLaunchForm } from './InlineLaunchForm';
export { LaunchOptionsPanel } from './LaunchOptionsPanel';

export const EmptyInstanceState: React.FC<EmptyInstanceStateProps> = ({
	ubuntuIconUri,
	ubuntuDarkIconUri,
	fedoraIconUri,
	fedoraDarkIconUri,
	debianIconUri,
	debianDarkIconUri,
	multipassCapabilities,
	inlineImageOptions,
	isLoadingInlineImages,
	onCreateCloudInitInstance,
	onCreateProfileInstance,
	onLaunchFromInlineForm,
	onRequestInlineImages,
	onOptimisticLaunch
}) => {
	const [showEmptyOptions, setShowEmptyOptions] = React.useState(false);
	const [inlineLaunchMode, setInlineLaunchMode] = React.useState<'quick' | 'custom' | null>(null);

	if (inlineLaunchMode) {
		return (
			<InlineLaunchForm
				mode={inlineLaunchMode}
				ubuntuIconUri={ubuntuIconUri}
				ubuntuDarkIconUri={ubuntuDarkIconUri}
				fedoraIconUri={fedoraIconUri}
				fedoraDarkIconUri={fedoraDarkIconUri}
				debianIconUri={debianIconUri}
				debianDarkIconUri={debianDarkIconUri}
				multipassCapabilities={multipassCapabilities}
				inlineImageOptions={inlineImageOptions}
				isLoadingInlineImages={isLoadingInlineImages}
				onBack={() => setInlineLaunchMode(null)}
				onLaunchFromInlineForm={onLaunchFromInlineForm}
				onRequestInlineImages={onRequestInlineImages}
				onOptimisticLaunch={onOptimisticLaunch}
			/>
		);
	}

	if (showEmptyOptions) {
		return (
			<LaunchOptionsPanel
				onQuick={() => setInlineLaunchMode('quick')}
				onCustom={() => setInlineLaunchMode('custom')}
				onCreateCloudInitInstance={onCreateCloudInitInstance}
				onCreateProfileInstance={onCreateProfileInstance}
			/>
		);
	}

	return (
		<div
			style={{
				minHeight: '100vh',
				padding: '24px 30px 20px',
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'flex-start',
				fontFamily: 'Ubuntu, system-ui, -apple-system, sans-serif'
			}}
		>
			<div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'stretch', width: '100%' }}>
				<EmptyHero />
				<QuickInstallButton onClick={() => setInlineLaunchMode('quick')} />
				<button
					type="button"
					onClick={() => setShowEmptyOptions(true)}
					style={{
						marginTop: '24px',
						background: 'transparent',
						border: 'none',
						color: 'var(--vscode-descriptionForeground)',
						cursor: 'pointer',
						fontSize: '13px',
						fontWeight: 500,
						fontFamily: 'Ubuntu, system-ui, -apple-system, sans-serif',
						textDecoration: 'underline',
						textUnderlineOffset: '4px'
					}}
				>
					More options...
				</button>
			</div>
			<div
				style={{
					width: 'calc(100% + 60px)',
					margin: '0 -30px',
					padding: '14px 22px 0',
					borderTop: '1px solid rgba(127,127,127,0.13)',
					color: 'var(--vscode-descriptionForeground)',
					fontSize: '12px',
					display: 'flex',
					alignItems: 'center',
					gap: '10px',
					opacity: 0.75
				}}
			>
				<span aria-hidden="true">✓</span>
				<span>Multipass detected</span>
			</div>
		</div>
	);
};
