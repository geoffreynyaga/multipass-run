import React from 'react';

import type { InlineLaunchConfig } from '../../App';
import type { MultipassCapabilities } from '../../../utils/multipassVersion';
import { getMonoFont } from '../../utils/fontUtils';

interface EmptyInstanceStateProps {
	ubuntuIconUri: string;
	ubuntuDarkIconUri: string;
	fedoraIconUri: string;
	fedoraDarkIconUri: string;
	debianIconUri: string;
	debianDarkIconUri: string;
	multipassCapabilities: MultipassCapabilities;
	onCreateCloudInitInstance: () => void;
	onCreateProfileInstance: () => void;
	onLaunchFromInlineForm: (config: InlineLaunchConfig) => void;
	onOptimisticLaunch: (launch: { name: string; release: string }) => void;
}

const EmptyHero: React.FC = () => (
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

const QuickInstallButton: React.FC<{ onClick: () => void; compact?: boolean }> = ({ onClick, compact = false }) => (
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

const InlineLaunchForm: React.FC<{
	mode: 'quick' | 'custom';
	ubuntuIconUri: string;
	ubuntuDarkIconUri: string;
	fedoraIconUri: string;
	fedoraDarkIconUri: string;
	debianIconUri: string;
	debianDarkIconUri: string;
	multipassCapabilities: MultipassCapabilities;
	onBack: () => void;
	onLaunchFromInlineForm: (config: InlineLaunchConfig) => void;
	onOptimisticLaunch: (launch: { name: string; release: string }) => void;
}> = ({
	mode,
	ubuntuIconUri,
	ubuntuDarkIconUri,
	fedoraIconUri,
	fedoraDarkIconUri,
	debianIconUri,
	debianDarkIconUri,
	multipassCapabilities,
	onBack,
	onLaunchFromInlineForm,
	onOptimisticLaunch
}) => {
	const [name, setName] = React.useState('');
	const [distro, setDistro] = React.useState<InlineLaunchConfig['distro']>('ubuntu');
	const [cpus, setCpus] = React.useState('2');
	const [memory, setMemory] = React.useState('2');
	const [disk, setDisk] = React.useState('10');
	const [isSubmitting, setIsSubmitting] = React.useState(false);
	const isCustom = mode === 'custom';
	const supportsAlternativeDistros = multipassCapabilities.supportsAlternativeDistros;
	const distroIcons: Record<InlineLaunchConfig['distro'], string> = {
		ubuntu: ubuntuIconUri || ubuntuDarkIconUri,
		fedora: fedoraIconUri || fedoraDarkIconUri,
		debian: debianIconUri || debianDarkIconUri,
	};
	const launchPreview = [
		'multipass launch',
		distro === 'ubuntu' ? '' : distro,
		name.trim() ? `--name ${name.trim()}` : '',
		isCustom ? `--cpus ${cpus}` : '',
		isCustom ? `--memory ${memory}G` : '',
		isCustom ? `--disk ${disk}G` : '',
	].filter(Boolean).join(' ');

	const fieldStyle: React.CSSProperties = {
		width: '100%',
		background: 'var(--vscode-input-background)',
		color: 'var(--vscode-input-foreground)',
		border: '1px solid var(--vscode-input-border, rgba(127,127,127,0.28))',
		borderRadius: '3px',
		padding: '8px 10px',
		fontSize: '13px',
		fontFamily: 'Ubuntu, system-ui, -apple-system, sans-serif',
		outline: 'none'
	};
	const labelStyle: React.CSSProperties = {
		display: 'block',
		marginBottom: '6px',
		fontSize: '11px',
		fontWeight: 600,
		color: 'var(--vscode-descriptionForeground)'
	};
	const distroButtonStyle = (value: InlineLaunchConfig['distro']): React.CSSProperties => ({
		border: value === distro ? '1px solid #E95420' : '1px solid transparent',
		background: value === distro ? 'rgba(233,84,32,0.12)' : 'rgba(255,255,255,0.04)',
		color: 'var(--vscode-foreground)',
		borderRadius: '999px',
		padding: '6px 9px',
		cursor: 'pointer',
		fontSize: '11px',
		fontWeight: 600,
		fontFamily: 'Ubuntu, system-ui, -apple-system, sans-serif',
		display: 'inline-flex',
		alignItems: 'center',
		gap: '5px',
		minHeight: '30px'
	});
	const distroIconStyle: React.CSSProperties = {
		width: '13px',
		height: '13px',
		display: 'block',
		borderRadius: '50%'
	};

	const submit = () => {
		if (isSubmitting) {
			return;
		}
		setIsSubmitting(true);
		const instanceName = name.trim() || `multipass-${Date.now().toString(36)}`;
		onLaunchFromInlineForm({
			mode,
			name: instanceName,
			distro,
			cpus: isCustom ? cpus : undefined,
			memory: isCustom ? `${memory}G` : undefined,
			disk: isCustom ? `${disk}G` : undefined
		});
		onOptimisticLaunch({
			name: instanceName,
			release: distro === 'ubuntu'
				? 'Ubuntu LTS'
				: `${distro.charAt(0).toUpperCase()}${distro.slice(1)}`
		});
		onBack();
	};

	return (
		<div
			style={{
				minHeight: '100vh',
				padding: '24px 30px 28px',
				display: 'flex',
				flexDirection: 'column',
				fontFamily: 'Ubuntu, system-ui, -apple-system, sans-serif'
			}}
		>
			<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
				<div
					style={{
						fontSize: '11px',
						textTransform: 'uppercase',
						letterSpacing: '2px',
						color: 'var(--vscode-descriptionForeground)',
						fontWeight: 700
					}}
				>
					{isCustom ? 'Launch custom instance' : 'Quick install LTS'}
				</div>
				<button
					type="button"
					onClick={onBack}
					aria-label="Close launch form"
					title="Close"
					style={{
						background: 'transparent',
						border: 'none',
						color: 'var(--vscode-descriptionForeground)',
						cursor: 'pointer',
						fontSize: '20px',
						lineHeight: 1
					}}
				>
					x
				</button>
			</div>

			<div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
				<div>
					<label style={labelStyle}>Name <span style={{ opacity: 0.65 }}>(optional)</span></label>
					<input
						value={name}
						onChange={(event) => setName(event.currentTarget.value)}
						placeholder="my-vm"
						style={fieldStyle}
					/>
				</div>

				<div>
					<label style={labelStyle}>Distro</label>
					<div style={{ display: 'flex', gap: '6px', flexWrap: 'nowrap' }}>
						<button type="button" style={distroButtonStyle('ubuntu')} onClick={() => setDistro('ubuntu')}>
							{distroIcons.ubuntu ? <img src={distroIcons.ubuntu} alt="" style={distroIconStyle} /> : <span aria-hidden="true">*</span>}
							Ubuntu
						</button>
						{supportsAlternativeDistros && (
							<>
								<button type="button" style={distroButtonStyle('fedora')} onClick={() => setDistro('fedora')}>
									{distroIcons.fedora ? <img src={distroIcons.fedora} alt="" style={distroIconStyle} /> : <span aria-hidden="true">*</span>}
									Fedora
								</button>
								<button type="button" style={distroButtonStyle('debian')} onClick={() => setDistro('debian')}>
									{distroIcons.debian ? <img src={distroIcons.debian} alt="" style={distroIconStyle} /> : <span aria-hidden="true">*</span>}
									Debian
								</button>
							</>
						)}
					</div>
				</div>

				{isCustom && (
					<>
						<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
							<div>
								<label style={labelStyle}>CPU</label>
								<input value={cpus} onChange={(event) => setCpus(event.currentTarget.value)} style={fieldStyle} />
							</div>
							<div>
								<label style={labelStyle}>Memory (GB)</label>
								<input value={memory} onChange={(event) => setMemory(event.currentTarget.value)} style={fieldStyle} />
							</div>
						</div>
						<div>
							<label style={labelStyle}>Disk (GB)</label>
							<input value={disk} onChange={(event) => setDisk(event.currentTarget.value)} style={fieldStyle} />
						</div>
					</>
				)}

				<div
					style={{
						background: 'var(--vscode-textCodeBlock-background, var(--vscode-editor-background))',
						border: '1px solid var(--vscode-input-border, rgba(127,127,127,0.16))',
						borderRadius: '4px',
						padding: '12px',
						color: 'var(--vscode-editor-foreground)',
						fontSize: '11px',
						fontFamily: getMonoFont(),
						lineHeight: 1.6,
						wordBreak: 'break-word'
					}}
				>
					<span style={{ opacity: 0.65 }}>$ </span>
					{launchPreview}
				</div>
			</div>

			<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', paddingTop: '16px' }}>
				<button
					type="button"
					onClick={onBack}
					style={{
						background: 'rgba(255,255,255,0.04)',
						color: 'var(--vscode-foreground)',
						border: '1px solid rgba(127,127,127,0.24)',
						borderRadius: '3px',
						padding: '10px 12px',
						cursor: 'pointer',
						fontSize: '13px',
						fontWeight: 600,
						fontFamily: 'Ubuntu, system-ui, -apple-system, sans-serif'
					}}
				>
					Cancel
				</button>
				<button
					type="button"
					onClick={submit}
					disabled={isSubmitting}
					style={{
						background: '#E95420',
						color: '#ffffff',
						border: 'none',
						borderRadius: '3px',
						padding: '10px 12px',
						cursor: 'pointer',
						fontSize: '13px',
						fontWeight: 600,
						fontFamily: 'Ubuntu, system-ui, -apple-system, sans-serif',
						opacity: isSubmitting ? 0.75 : 1
					}}
				>
					{isSubmitting ? 'Launching...' : 'Launch'}
				</button>
			</div>
		</div>
	);
};

export const EmptyInstanceState: React.FC<EmptyInstanceStateProps> = ({
	ubuntuIconUri,
	ubuntuDarkIconUri,
	fedoraIconUri,
	fedoraDarkIconUri,
	debianIconUri,
	debianDarkIconUri,
	multipassCapabilities,
	onCreateCloudInitInstance,
	onCreateProfileInstance,
	onLaunchFromInlineForm,
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
				onBack={() => setInlineLaunchMode(null)}
				onLaunchFromInlineForm={onLaunchFromInlineForm}
				onOptimisticLaunch={onOptimisticLaunch}
			/>
		);
	}

	if (!showEmptyOptions) {
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
	}

	const quickActionStyle: React.CSSProperties = {
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
	};
	const iconBoxStyle: React.CSSProperties = {
		width: '30px',
		height: '30px',
		borderRadius: '4px',
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		background: 'rgba(255,255,255,0.04)',
		color: 'var(--vscode-descriptionForeground)'
	};
	const emptyOptionLabelStyle: React.CSSProperties = {
		display: 'block',
		fontSize: '13px',
		fontWeight: 500,
		color: 'var(--vscode-foreground)',
		lineHeight: 1.25
	};
	const emptyOptionDescriptionStyle: React.CSSProperties = {
		display: 'block',
		marginTop: '2px',
		fontSize: '12px',
		color: 'var(--vscode-descriptionForeground)',
		lineHeight: 1.25
	};
	const chevronRight = (
		<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
			<path d="M5.25 3.5L8.75 7L5.25 10.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);

	return (
		<div
			style={{
				minHeight: '100vh',
				padding: '24px 30px 36px',
				display: 'flex',
				flexDirection: 'column',
				fontFamily: 'Ubuntu, system-ui, -apple-system, sans-serif',
				background: 'linear-gradient(135deg, transparent 0 58%, rgba(233,84,32,0.16) 58% 100%)'
			}}
		>
			<EmptyHero />
			<div style={{ marginBottom: '28px' }}>
				<QuickInstallButton compact onClick={() => setInlineLaunchMode('quick')} />
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
					<button type="button" style={quickActionStyle} onClick={() => setInlineLaunchMode('custom')}>
						<span style={iconBoxStyle}>*</span>
						<span>
							<span style={emptyOptionLabelStyle}>Configure a custom instance</span>
							<span style={emptyOptionDescriptionStyle}>Pick CPU, RAM, disk, image</span>
						</span>
						<span style={{ color: 'var(--vscode-descriptionForeground)' }}>{chevronRight}</span>
					</button>
					<button type="button" style={quickActionStyle} onClick={onCreateCloudInitInstance}>
						<span style={iconBoxStyle}>▣</span>
						<span>
							<span style={emptyOptionLabelStyle}>Open cloud-init YAML</span>
							<span style={emptyOptionDescriptionStyle}>Edit, validate, then launch</span>
						</span>
						<span style={{ color: 'var(--vscode-descriptionForeground)' }}>{chevronRight}</span>
					</button>
					<button type="button" style={quickActionStyle} onClick={onCreateProfileInstance}>
						<span style={iconBoxStyle}>□</span>
						<span>
							<span style={emptyOptionLabelStyle}>Your profiles</span>
							<span style={emptyOptionDescriptionStyle}>Reusable Multipass configurations</span>
						</span>
						<span style={{ color: 'var(--vscode-descriptionForeground)' }}>{chevronRight}</span>
					</button>
				</div>
			</div>
		</div>
	);
};

