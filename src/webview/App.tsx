import React, { useEffect, useState } from 'react';

import type { MultipassInstanceInfo } from '../commands/getInstanceInfo';
import type { InstanceLists } from '../commands/listInstances';
import type { MultipassSnapshot } from '../commands/listSnapshots';
import type { ZonesResult } from '../commands/zones';
import { ZONE_REFRESH_INTERVAL_MS } from '../shared/constants';
import type { ExtensionMessage, InlineLaunchConfig, WebviewMessage } from '../shared/messages';
import type { InstallPlan } from '../utils/installPackageManager';
import type { MultipassImageOption } from '../utils/multipassImages';
import type { MultipassCapabilities } from '../utils/multipassVersion';
import { DaemonErrorScreen } from './components/DaemonErrorScreen';
import { InstallMissingScreen } from './components/InstallMissingScreen';
import InstanceList from './components/InstanceList';
import { ZonesView } from './components/ZonesView';

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

export type { InlineLaunchConfig };

export type InlineImageOption = MultipassImageOption;

const App: React.FC = () => {
	const [instanceLists, setInstanceLists] = useState<InstanceLists>(
		window.initialState || { active: [], deleted: [] }
	);
	const [instanceInfo, setInstanceInfo] = useState<MultipassInstanceInfo | null>(null);
	const [snapshotsByInstance, setSnapshotsByInstance] = useState<Record<string, MultipassSnapshot[]>>({});
	const [multipassCapabilities, setMultipassCapabilities] = useState<MultipassCapabilities>(
		window.multipassCapabilities || { supportsFedora: false, supportsDebian: false }
	);
	const [installPlan, setInstallPlan] = useState<InstallPlan | null>(window.installPlan || null);
	const [inlineImageOptions, setInlineImageOptions] = useState<InlineImageOption[]>([]);
	const [isLoadingInlineImages, setIsLoadingInlineImages] = useState(false);

	const [activeTab, setActiveTab] = useState<'vms' | 'zones'>('vms');
	const [zones, setZones] = useState<ZonesResult | null>(null);
	const [zonesRefreshing, setZonesRefreshing] = useState(false);
	const [pendingZone, setPendingZone] = useState<string | null>(null);
	const [zoneActionError, setZoneActionError] = useState<string | null>(null);
	const [selectedZone, setSelectedZone] = useState<string | null>(null);
	const zoneRequestPending = React.useRef(false);
	const requestZones = React.useCallback(() => {
		if (zoneRequestPending.current) { return; }
		zoneRequestPending.current = true;
		setZonesRefreshing(true);
		vscode.postMessage({ command: 'getZones' } satisfies WebviewMessage);
	}, []);

	const isMultipassNotInstalled = instanceLists.error?.type === 'not-installed';
	const isDaemonNotRunning = instanceLists.error?.type === 'daemon-not-running';

	useEffect(() => {
		const handleMessage = (event: MessageEvent) => {
			const message = event.data as ExtensionMessage;

			switch (message.command) {
				case 'zones':
					zoneRequestPending.current = false;
					setZonesRefreshing(false);
					setZones(message.result);
					break;
				case 'zoneActionResult':
					setPendingZone(null);
					setZoneActionError(message.error || null);
					if (message.success) {
						setInstanceInfo(null);
						setSnapshotsByInstance({});
					}
					break;
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

	useEffect(() => {
		if (activeTab !== 'zones') { return; }
		requestZones();
		const timer = window.setInterval(requestZones, ZONE_REFRESH_INTERVAL_MS);
		return () => window.clearInterval(timer);
	}, [activeTab, requestZones]);

	const post = (message: WebviewMessage) => vscode.postMessage(message);

	const handleCreateInstance = () => post({ command: 'launchInstance' });
	const handleCreateCustomInstance = () => post({ command: 'launchCustomInstance' });
	const handleCreateCloudInitInstance = () => post({ command: 'launchCloudInitInstance' });
	const handleCreateProfileInstance = () => post({ command: 'launchProfileInstance' });
	const handleLaunchFromInlineForm = (config: InlineLaunchConfig) => post({ command: 'launchInlineInstance', config });
	const handleRequestInlineImages = React.useCallback((distro: InlineLaunchConfig['distro']) => {
		setIsLoadingInlineImages(true);
		post({ command: 'getInlineImageOptions', distro });
	}, []);
	const handleStartInstance = (name: string) => post({ command: 'startInstance', instanceName: name });
	const handleStopInstance = (name: string) => post({ command: 'stopInstance', instanceName: name });
	const handleSuspendInstance = (name: string) => post({ command: 'suspendInstance', instanceName: name });
	const handleShellInstance = (name: string) => post({ command: 'shellInstance', instanceName: name });
	const handleSetupSSHInstance = (name: string) => post({ command: 'setupSSHInstance', instanceName: name });
	const handleStartAndShellInstance = (name: string) => post({ command: 'startAndShellInstance', instanceName: name });
	const handleRecoverAndShellInstance = (name: string) => post({ command: 'recoverAndShellInstance', instanceName: name });
	const handleDeleteInstance = (name: string) => post({ command: 'deleteInstance', instanceName: name });
	const handleRecoverInstance = (name: string) => post({ command: 'recoverInstance', instanceName: name });
	const handlePurgeInstance = (name: string) => post({ command: 'purgeInstance', instanceName: name });
	const handleGetInstanceInfo = (name: string) => post({ command: 'getInstanceInfo', instanceName: name });
	const handleOpenFullDiskAccessSettings = () => post({ command: 'openFullDiskAccessSettings' });
	const handleAddMount = (name: string) => post({ command: 'addMount', instanceName: name });
	const handleRemoveMount = (name: string, guestPath: string) =>
		post({ command: 'removeMount', instanceName: name, guestPath });
	const handleGetSnapshots = (name: string) => post({ command: 'getSnapshots', instanceName: name });
	const handleTakeSnapshot = (name: string, snapshotName?: string, comment?: string) =>
		post({ command: 'takeSnapshot', instanceName: name, name: snapshotName, comment });
	const handleRestoreSnapshot = (name: string, snapshotName: string) =>
		post({ command: 'restoreSnapshot', instanceName: name, snapshotName });
	const handleDeleteSnapshot = (name: string, snapshotName: string) =>
		post({ command: 'deleteSnapshot', instanceName: name, snapshotName });
	const handleRefreshList = () => post({ command: 'refreshList' });
	const handleClearPendingLaunch = (name: string) => post({ command: 'clearPendingLaunch', instanceName: name });
	const handleDownloadMultipass = () => post({ command: 'downloadMultipass' });
	const handleInstallViaTerminal = () => post({ command: 'installMultipassViaTerminal' });
	const handleCopyInstallCommand = () => post({ command: 'copyInstallCommand' });
	const handleOpenManagerHelp = () => post({ command: 'openInstallManagerHelp' });
	const handleOpenDocs = () => post({ command: 'openMultipassDocumentation' });

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
		<>
			<div className="workspace-tabs" role="tablist" aria-label="Multipass views">
				{(['vms', 'zones'] as const).map(tab => (
					<button key={tab} type="button" role="tab" id={`tab-${tab}`} aria-controls={`panel-${tab}`}
						aria-selected={activeTab === tab} tabIndex={activeTab === tab ? 0 : -1}
						onClick={() => setActiveTab(tab)} onKeyDown={event => {
							if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) { return; }
							event.preventDefault();
							const next = event.key === 'Home' ? 'vms' : event.key === 'End' ? 'zones' : tab === 'vms' ? 'zones' : 'vms';
							setActiveTab(next);
							document.getElementById(`tab-${next}`)?.focus();
						}}>{tab === 'vms' ? 'VMs' : 'Zones'}</button>
				))}
			</div>
			<div role="tabpanel" id="panel-zones" aria-labelledby="tab-zones" hidden={activeTab !== 'zones'}>
				<ZonesView result={zones} instances={[...instanceLists.active, ...instanceLists.deleted]}
					refreshing={zonesRefreshing} pendingZone={pendingZone} actionError={zoneActionError} selectedZone={activeTab === 'zones' ? selectedZone : null}
					onRefresh={requestZones} onChangeAvailability={(zoneName, available) => {
						setPendingZone(zoneName);
						setZoneActionError(null);
						post({ command: 'setZoneAvailability', zoneName, available });
					}} />
			</div>
			<div role="tabpanel" id="panel-vms" aria-labelledby="tab-vms" hidden={activeTab !== 'vms'}>
				<InstanceList
					onViewZone={name => { setSelectedZone(name); setActiveTab('zones'); }}
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
			</div>
		</>
	);
};

export default App;
