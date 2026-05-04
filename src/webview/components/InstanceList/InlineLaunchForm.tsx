import React from 'react';

import type { InlineLaunchConfig } from '../../App';
import type { InlineLaunchFormProps } from './types';
import { getMonoFont } from '../../utils/fontUtils';

export const InlineLaunchForm: React.FC<InlineLaunchFormProps> = ({
	mode,
	ubuntuIconUri,
	ubuntuDarkIconUri,
	fedoraIconUri,
	fedoraDarkIconUri,
	debianIconUri,
	debianDarkIconUri,
	multipassCapabilities,
	inlineImageOptions,
	isLoadingInlineImages,
	onBack,
	onLaunchFromInlineForm,
	onRequestInlineImages,
	onOptimisticLaunch
}) => {
	const [name, setName] = React.useState('');
	const [distro, setDistro] = React.useState<InlineLaunchConfig['distro']>('ubuntu');
	const [selectedImageKey, setSelectedImageKey] = React.useState('');
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
		selectedImageKey || (distro === 'ubuntu' ? '' : distro),
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
	const filteredImageOptions = React.useMemo(
		() => inlineImageOptions.filter((option) => option.distro === distro),
		[inlineImageOptions, distro]
	);
	const selectedImage = filteredImageOptions.find((option) => option.imageKey === selectedImageKey) ?? filteredImageOptions[0];

	React.useEffect(() => {
		if (isCustom) {
			onRequestInlineImages(distro);
		}
	}, [distro, isCustom, onRequestInlineImages]);

	React.useEffect(() => {
		if (!isCustom) {
			return;
		}
		if (filteredImageOptions.length === 0) {
			setSelectedImageKey('');
			return;
		}
		if (!filteredImageOptions.some((option) => option.imageKey === selectedImageKey)) {
			setSelectedImageKey(filteredImageOptions[0].imageKey);
		}
	}, [filteredImageOptions, isCustom, selectedImageKey]);

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
			image: isCustom ? selectedImage?.imageKey : undefined,
			imageRelease: isCustom ? selectedImage?.release : undefined,
			cpus: isCustom ? cpus : undefined,
			memory: isCustom ? `${memory}G` : undefined,
			disk: isCustom ? `${disk}G` : undefined
		});
		onOptimisticLaunch({
			name: instanceName,
			release: selectedImage?.release || (distro === 'ubuntu'
				? 'Ubuntu LTS'
				: `${distro.charAt(0).toUpperCase()}${distro.slice(1)}`)
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
						<div>
							<label style={labelStyle}>Image</label>
							<select
								value={selectedImageKey}
								onChange={(event) => setSelectedImageKey(event.currentTarget.value)}
								disabled={isLoadingInlineImages || filteredImageOptions.length === 0}
								style={fieldStyle}
							>
								{isLoadingInlineImages && filteredImageOptions.length === 0 && (
									<option value="">Loading images...</option>
								)}
								{!isLoadingInlineImages && filteredImageOptions.length === 0 && (
									<option value="">No images found</option>
								)}
								{filteredImageOptions.map((option) => (
									<option key={option.imageKey} value={option.imageKey}>
										{option.label}
									</option>
								))}
							</select>
							{selectedImage?.detail && (
								<div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--vscode-descriptionForeground)', lineHeight: 1.35 }}>
									{selectedImage.detail}
								</div>
							)}
						</div>
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
