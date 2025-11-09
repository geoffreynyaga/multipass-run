import { InstanceLists, MultipassInstanceInfo } from '../multipassService';
import React, { useEffect, useState } from 'react';

import  InstanceList from './components/InstanceList';

declare const acquireVsCodeApi: () => any;
declare global {
	interface Window {
		initialState?: InstanceLists;
		ubuntuIconUri?: string;
		ubuntuDarkIconUri?: string;
		fedoraIconUri?: string;
		fedoraDarkIconUri?: string;
		debianIconUri?: string;
		debianDarkIconUri?: string;
		extensionIconUri?: string;
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

	// Check if multipass is not installed
	const isMultipassNotInstalled = instanceLists.error?.type === 'not-installed';

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

	const handleSuspendInstance = (name: string) => {
		vscode.postMessage({ command: 'suspendInstance', instanceName: name });
	};

	const handleShellInstance = (name: string) => {
		vscode.postMessage({ command: 'shellInstance', instanceName: name });
	};

	const handleStartAndShellInstance = (name: string) => {
		vscode.postMessage({ command: 'startAndShellInstance', instanceName: name });
	};

	const handleRecoverAndShellInstance = (name: string) => {
		vscode.postMessage({ command: 'recoverAndShellInstance', instanceName: name });
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

	const handleDownloadMultipass = () => {
		vscode.postMessage({ command: 'downloadMultipass' });
	};

	// If multipass is not installed, show error message with download options
	if (isMultipassNotInstalled) {
		return (
			<div
				className="flex flex-col items-center justify-evenly min-h-[300px] px-6 py-12"
				style={{ fontFamily: 'Ubuntu, system-ui, -apple-system, sans-serif' }}
			>
				{/* Icon - Custom warning icon in Ubuntu Orange */}
				<div className="mb-6">
					<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
						<circle cx="24" cy="24" r="20" stroke="#E95420" strokeWidth="2" fill="none"/>
						<path d="M24 16V26" stroke="#E95420" strokeWidth="2" strokeLinecap="round"/>
						<circle cx="24" cy="32" r="1.5" fill="#E95420"/>
					</svg>
				</div>

				{/* Heading */}
				<h2
					className="mb-3 text-xl font-light"
					style={{
						color: 'var(--vscode-foreground)',
						fontFamily: 'Ubuntu, system-ui, -apple-system, sans-serif'
					}}
				>
					Multipass not found
				</h2>

				{/* Description */}
				<p
					className="max-w-md mb-8 text-sm leading-relaxed text-center"
					style={{ color: 'var(--vscode-descriptionForeground)' }}
				>
					Multipass is not installed on your system. Please install it to use this extension.
				</p>

				{/* Actions */}
				{/* Actions */}
				<div className="flex flex-col w-full max-w-xs" style={{ gap: '12px' }}>
					<button
						onClick={handleDownloadMultipass}
						className="w-full bg-[#E95420] text-white text-sm font-normal rounded-sm hover:bg-[#C73E1A] transition-colors"
						style={{
							padding: '10px 24px'
						}}
					>
						Download Multipass
					</button>
					<button
						onClick={handleRefreshList}
						className="w-full text-sm font-normal transition-colors border rounded-sm"
						style={{
							padding: '10px 24px',
							backgroundColor: 'var(--vscode-button-secondaryBackground)',
							color: 'var(--vscode-button-secondaryForeground)',
							borderColor: 'var(--vscode-button-border, var(--vscode-contrastBorder))'
						}}
						onMouseEnter={(e) => {
							e.currentTarget.style.backgroundColor = 'var(--vscode-button-secondaryHoverBackground)';
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.backgroundColor = 'var(--vscode-button-secondaryBackground)';
						}}
					>
						Refresh
					</button>
				</div>
			</div>
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
			onStartInstance={handleStartInstance}
			onStopInstance={handleStopInstance}
			onSuspendInstance={handleSuspendInstance}
			onShellInstance={handleShellInstance}
			onStartAndShellInstance={handleStartAndShellInstance}
			onRecoverAndShellInstance={handleRecoverAndShellInstance}
			onDeleteInstance={handleDeleteInstance}
			onRecoverInstance={handleRecoverInstance}
			onPurgeInstance={handlePurgeInstance}
			onGetInstanceInfo={handleGetInstanceInfo}
			onRefreshList={handleRefreshList}
		/>
	);
};

export default App;
