import { InstanceLists, MultipassInstanceInfo } from '../multipassService';
import React, { useEffect, useState } from 'react';

import  InstanceList from './components/InstanceList';

declare const acquireVsCodeApi: () => any;
declare global {
	interface Window {
		initialState?: InstanceLists;
		ubuntuIconUri?: string;
		ubuntuDarkIconUri?: string;
	}
}

const vscode = acquireVsCodeApi();

const App: React.FC = () => {
	const [instanceLists, setInstanceLists] = useState<InstanceLists>(
		window.initialState || { active: [], deleted: [] }
	);
	const [instanceInfo, setInstanceInfo] = useState<MultipassInstanceInfo | null>(null);

	// Debug: Log initial state
	console.log('App mounted. Initial state:', window.initialState);
	console.log('Instance lists:', instanceLists);

	useEffect(() => {
		// Listen for messages from the extension
		const handleMessage = (event: MessageEvent) => {
			const message = event.data;
			console.log('Message received:', message);

			switch (message.command) {
				case 'updateInstances':
					setInstanceLists(message.instanceLists);
					break;
				case 'instanceInfo':
					setInstanceInfo(message.info);
					break;
			}
		};

		window.addEventListener('message', handleMessage);

		return () => {
			window.removeEventListener('message', handleMessage);
		};
	}, []);

	const handleCreateInstance = () => {
		vscode.postMessage({ command: 'launchInstance' });
	};

	const handleStartInstance = (name: string) => {
		vscode.postMessage({ command: 'startInstance', instanceName: name });
	};

	const handleStopInstance = (name: string) => {
		vscode.postMessage({ command: 'stopInstance', instanceName: name });
	};

	const handleDeleteInstance = (name: string) => {
		console.log('handleDeleteInstance called for:', name);
		vscode.postMessage({ command: 'deleteInstance', instanceName: name });
		console.log('deleteInstance message sent to extension');
	};

	const handleRecoverInstance = (name: string) => {
		vscode.postMessage({ command: 'recoverInstance', instanceName: name });
	};

	const handlePurgeInstance = (name: string) => {
		vscode.postMessage({ command: 'purgeInstance', instanceName: name });
	};

	const handleGetInstanceInfo = (name: string) => {
		vscode.postMessage({ command: 'getInstanceInfo', instanceName: name });
	};

	const handleRefreshList = () => {
		vscode.postMessage({ command: 'refreshList' });
	};

	return (
		<InstanceList
			instanceLists={instanceLists}
			instanceInfo={instanceInfo}
			ubuntuIconUri={window.ubuntuIconUri || ''}
			onCreateInstance={handleCreateInstance}
			onStartInstance={handleStartInstance}
			onStopInstance={handleStopInstance}
			onDeleteInstance={handleDeleteInstance}
			onRecoverInstance={handleRecoverInstance}
			onPurgeInstance={handlePurgeInstance}
			onGetInstanceInfo={handleGetInstanceInfo}
			onRefreshList={handleRefreshList}
		/>
	);
};

export default App;
