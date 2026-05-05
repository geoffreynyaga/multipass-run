import { InstanceLists, MultipassInstanceInfo } from '../multipassService';
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
