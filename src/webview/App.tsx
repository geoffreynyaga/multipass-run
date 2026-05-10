import { InstanceLists, MultipassInstanceInfo, MultipassSnapshot } from '../multipassService';
import React, { useEffect, useState } from 'react';
import type { InstallPlan } from '../utils/installPackageManager';
import type { MultipassCapabilities } from '../utils/multipassVersion';
import type { MultipassDistro, MultipassImageOption } from '../utils/multipassImages';

import InstanceList from './components/InstanceList';
import { InstallMissingScreen } from './components/InstallMissingScreen';
import { DaemonErrorScreen } from './components/DaemonErrorScreen';

declare const acquireVsCodeApi: () => any;
declare global {
	interface Window {
		initialState?: InstanceLists;
		multipassCapabilities?: MultipassCapabilities;
		ubuntuIconUri?: string;
		ubuntuDarkIconUri?: string;
		fedoraIconUri?: string;
		fedoraDarkIconUri?: string;
		debianIconUri?: string;
		debianDarkIconUri?: string;
		installPlan?: InstallPlan | null;
		hostPlatform?: string;
	}
}

const vscode = acquireVsCodeApi();

export interface InlineLaunchConfig {
	mode: 'quick' | 'custom';
	name?: string;
	distro: MultipassDistro;
	image?: string;
	imageRelease?: string;
	cpus?: string;
	memory?: string;
	disk?: string;
}

export type InlineImageOption = MultipassImageOption;

const App: React.FC = () => {
	const [instanceLists, setInstanceLists] = useState<InstanceLists>(
		window.initialState || { active: [], deleted: [] }
	);
	const [instanceInfo, setInstanceInfo] = useState<MultipassInstanceInfo | null>(null);
	const [snapshotsByInstance, setSnapshotsByInstance] = useState<Record<string, MultipassSnapshot[]>>({});
	const [multipassCapabilities, setMultipassCapabilities] = useState<MultipassCapabilities>(
		window.multipassCapabilities || { supportsAlternativeDistros: false }
	);
	const [installPlan, setInstallPlan] = useState<InstallPlan | null>(window.installPlan || null);
	const [inlineImageOptions, setInlineImageOptions] = useState<InlineImageOption[]>([]);
	const [isLoadingInlineImages, setIsLoadingInlineImages] = useState(false);

	const isMultipassNotInstalled = instanceLists.error?.type === 'not-installed';
	const isDaemonNotRunning = instanceLists.error?.type === 'daemon-not-running';

	useEffect(() => {
		const handleMessage = (event: MessageEvent) => {
			const message = event.data;

			switch (message.command) {
				case 'updateInstances':
					setInstanceLists(message.instanceLists);
					break;
				case 'instanceInfo':
					setInstanceInfo(message.info);
					break;
				case 'multipassCapabilities':
					setMultipassCapabilities(message.capabilities);
					break;
				case 'installPlan':
					setInstallPlan(message.plan);
					break;
				case 'inlineImageOptions':
					setInlineImageOptions(message.options || []);
					setIsLoadingInlineImages(false);
					break;
				case 'inlineImageOptionsError':
					setInlineImageOptions([]);
					setIsLoadingInlineImages(false);
					break;
				case 'snapshots':
					setSnapshotsByInstance((prev) => ({
						...prev,
						[message.instanceName]: message.snapshots || []
					}));
					break;
			}
		};

		window.addEventListener('message', handleMessage);
		return () => window.removeEventListener('message', handleMessage);
	}, []);

	const post = (command: string, payload?: Record<string, unknown>) =>
		vscode.postMessage({ command, ...payload });

	const handleCreateInstance = () => post('launchInstance');
	const handleCreateCustomInstance = () => post('launchCustomInstance');
	const handleCreateCloudInitInstance = () => post('launchCloudInitInstance');
	const handleCreateProfileInstance = () => post('launchProfileInstance');
	const handleLaunchFromInlineForm = (config: InlineLaunchConfig) => post('launchInlineInstance', { config });
	const handleRequestInlineImages = React.useCallback((distro: InlineLaunchConfig['distro']) => {
		setIsLoadingInlineImages(true);
		post('getInlineImageOptions', { distro });
	}, []);
	const handleStartInstance = (name: string) => post('startInstance', { instanceName: name });
	const handleStopInstance = (name: string) => post('stopInstance', { instanceName: name });
	const handleSuspendInstance = (name: string) => post('suspendInstance', { instanceName: name });
	const handleShellInstance = (name: string) => post('shellInstance', { instanceName: name });
	const handleSetupSSHInstance = (name: string) => post('setupSSHInstance', { instanceName: name });
	const handleStartAndShellInstance = (name: string) => post('startAndShellInstance', { instanceName: name });
	const handleRecoverAndShellInstance = (name: string) => post('recoverAndShellInstance', { instanceName: name });
	const handleDeleteInstance = (name: string) => post('deleteInstance', { instanceName: name });
	const handleRecoverInstance = (name: string) => post('recoverInstance', { instanceName: name });
	const handlePurgeInstance = (name: string) => post('purgeInstance', { instanceName: name });
	const handleGetInstanceInfo = (name: string) => post('getInstanceInfo', { instanceName: name });
	const handleOpenFullDiskAccessSettings = () => post('openFullDiskAccessSettings');
	const handleAddMount = (name: string) => post('addMount', { instanceName: name });
	const handleRemoveMount = (name: string, guestPath: string) =>
		post('removeMount', { instanceName: name, guestPath });
	const handleGetSnapshots = (name: string) => post('getSnapshots', { instanceName: name });
	const handleTakeSnapshot = (name: string, snapshotName?: string, comment?: string) =>
		post('takeSnapshot', { instanceName: name, name: snapshotName, comment });
	const handleRestoreSnapshot = (name: string, snapshotName: string) =>
		post('restoreSnapshot', { instanceName: name, snapshotName });
	const handleDeleteSnapshot = (name: string, snapshotName: string) =>
		post('deleteSnapshot', { instanceName: name, snapshotName });
	const handleRefreshList = () => post('refreshList');
	const handleClearPendingLaunch = (name: string) => post('clearPendingLaunch', { instanceName: name });
	const handleDownloadMultipass = () => post('downloadMultipass');
	const handleInstallViaTerminal = () => post('installMultipassViaTerminal');
	const handleCopyInstallCommand = () => post('copyInstallCommand');
	const handleOpenManagerHelp = () => post('openInstallManagerHelp');
	const handleOpenDocs = () => post('openMultipassDocumentation');

	if (isDaemonNotRunning) {
		return <DaemonErrorScreen onRefresh={handleRefreshList} />;
	}

	if (isMultipassNotInstalled) {
		return (
			<InstallMissingScreen
				plan={installPlan}
				onDownloadMultipass={handleDownloadMultipass}
				onInstallViaTerminal={handleInstallViaTerminal}
				onCopyInstallCommand={handleCopyInstallCommand}
				onOpenManagerHelp={handleOpenManagerHelp}
				onOpenDocs={handleOpenDocs}
				onRefreshList={handleRefreshList}
			/>
		);
	}

	return (
		<InstanceList
			instanceLists={instanceLists}
			instanceInfo={instanceInfo}
			snapshotsByInstance={snapshotsByInstance}
			hostPlatform={window.hostPlatform || ''}
			onOpenFullDiskAccessSettings={handleOpenFullDiskAccessSettings}
			onAddMount={handleAddMount}
			onRemoveMount={handleRemoveMount}
			onGetSnapshots={handleGetSnapshots}
			onTakeSnapshot={handleTakeSnapshot}
			onRestoreSnapshot={handleRestoreSnapshot}
			onDeleteSnapshot={handleDeleteSnapshot}
			ubuntuIconUri={window.ubuntuIconUri || ''}
			ubuntuDarkIconUri={window.ubuntuDarkIconUri || ''}
			fedoraIconUri={window.fedoraIconUri || ''}
			fedoraDarkIconUri={window.fedoraDarkIconUri || ''}
			debianIconUri={window.debianIconUri || ''}
			debianDarkIconUri={window.debianDarkIconUri || ''}
			onCreateInstance={handleCreateInstance}
			onCreateCustomInstance={handleCreateCustomInstance}
			onCreateCloudInitInstance={handleCreateCloudInitInstance}
			onCreateProfileInstance={handleCreateProfileInstance}
			onLaunchFromInlineForm={handleLaunchFromInlineForm}
			inlineImageOptions={inlineImageOptions}
			isLoadingInlineImages={isLoadingInlineImages}
			onRequestInlineImages={handleRequestInlineImages}
			multipassCapabilities={multipassCapabilities}
			onStartInstance={handleStartInstance}
			onStopInstance={handleStopInstance}
			onSuspendInstance={handleSuspendInstance}
			onShellInstance={handleShellInstance}
			onSetupSSHInstance={handleSetupSSHInstance}
			onStartAndShellInstance={handleStartAndShellInstance}
			onRecoverAndShellInstance={handleRecoverAndShellInstance}
			onDeleteInstance={handleDeleteInstance}
			onRecoverInstance={handleRecoverInstance}
			onPurgeInstance={handlePurgeInstance}
			onGetInstanceInfo={handleGetInstanceInfo}
			onRefreshList={handleRefreshList}
			onClearPendingLaunch={handleClearPendingLaunch}
		/>
	);
};

export default App;
