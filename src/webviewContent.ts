import * as vscode from 'vscode';

import { MultipassInstance, MultipassInstanceInfo } from './multipassService';

import { InstanceInfoView } from './views/instanceInfoView';
import { InstanceListView } from './views/instanceListView';

export class WebviewContent {
	public static getHtml(instances: MultipassInstance[], webview: vscode.Webview, extensionUri: vscode.Uri): string {
		const ubuntuIconUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'distros', 'ubuntu.svg'));
		const ubuntuDarkIconUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'distros', 'ubuntu-dark.svg'));
		const instancesHtml = InstanceListView.generateHtml(instances, ubuntuIconUri.toString(), ubuntuDarkIconUri.toString());

		return `<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>Multipass Instances</title>
			<style>
				${this.getStyles()}
			</style>
		</head>
		<body>
			<div>
				<ul id="instances-list">
					${instancesHtml}
				</ul>
			</div>
			<script>
				${this.getScript()}
			</script>
		</body>
		</html>`;
	}

	public static getDetailedInfoHtml(info: MultipassInstanceInfo): string {
		return InstanceInfoView.generateHtml(info);
	}

	private static getScript(): string {
		return `
			const vscode = acquireVsCodeApi();
			let expandedInstance = null;
			let startingInstances = new Set(); // Track instances that are starting

			function handleInstanceClick(instanceName) {
				const detailsDiv = document.getElementById('details-' + instanceName);
				const chevronDiv = document.getElementById('chevron-' + instanceName);
				const chevronIcon = chevronDiv ? chevronDiv.querySelector('.chevron-icon') : null;

				// If clicking the same instance, toggle it
				if (expandedInstance === instanceName) {
					detailsDiv.style.display = 'none';
					if (chevronIcon) {
						chevronIcon.style.transform = 'rotate(0deg)';
					}
					expandedInstance = null;
					return;
				}

				// Collapse previously expanded instance
				if (expandedInstance) {
					const prevDetails = document.getElementById('details-' + expandedInstance);
					const prevChevron = document.getElementById('chevron-' + expandedInstance);
					const prevChevronIcon = prevChevron ? prevChevron.querySelector('.chevron-icon') : null;
					if (prevDetails) {
						prevDetails.style.display = 'none';
					}
					if (prevChevronIcon) {
						prevChevronIcon.style.transform = 'rotate(0deg)';
					}
				}

				// Expand new instance
				expandedInstance = instanceName;
				detailsDiv.style.display = 'block';
				if (chevronIcon) {
					chevronIcon.style.transform = 'rotate(180deg)';
				}

				// Request details from extension
				vscode.postMessage({
					command: 'getInstanceInfo',
					instanceName: instanceName
				});
			}

			function stopInstance(instanceName) {
				// Add stopping state
				const instanceItem = document.querySelector('[data-instance-name="' + instanceName + '"]');
				if (instanceItem) {
					const stateElement = instanceItem.querySelector('.state');
					if (stateElement) {
						stateElement.textContent = 'Stopping';
						stateElement.className = 'state state-stopping';
					}
				}

				vscode.postMessage({
					command: 'stopInstance',
					instanceName: instanceName
				});
			}

			function startInstance(instanceName) {
				// Add starting state
				startingInstances.add(instanceName);
				const instanceItem = document.querySelector('[data-instance-name="' + instanceName + '"]');
				if (instanceItem) {
					const stateElement = instanceItem.querySelector('.state');
					if (stateElement) {
						stateElement.textContent = 'Starting';
						stateElement.className = 'state state-starting';
					}

					// Add spinner
					const header = instanceItem.querySelector('.instance-header');
					if (header && !header.querySelector('.spinner')) {
						const spinner = document.createElement('div');
						spinner.className = 'spinner';
						header.appendChild(spinner);
					}
				}

				vscode.postMessage({
					command: 'startInstance',
					instanceName: instanceName
				});
			}

			function createNewInstance() {
				vscode.postMessage({
					command: 'launchInstance'
				});
			}

			// Add context menu support
			document.addEventListener('contextmenu', (e) => {
				const instanceItem = e.target.closest('.instance-item');
				if (instanceItem) {
					e.preventDefault();
					const instanceName = instanceItem.getAttribute('data-instance-name');
					const instanceState = instanceItem.querySelector('.state').textContent.toLowerCase();

					// Show context menu with appropriate options based on state
					showContextMenu(e.clientX, e.clientY, instanceName, instanceState);
				}
			});

			function showContextMenu(x, y, instanceName, instanceState) {
				// Remove existing context menu if any
				const existingMenu = document.getElementById('context-menu');
				if (existingMenu) {
					existingMenu.remove();
				}

				const menu = document.createElement('div');
				menu.id = 'context-menu';
				menu.style.position = 'fixed';
				menu.style.left = x + 'px';
				menu.style.top = y + 'px';
				menu.style.background = 'var(--vscode-menu-background)';
				menu.style.border = '1px solid var(--vscode-menu-border)';
				menu.style.borderRadius = '4px';
				menu.style.padding = '4px 0';
				menu.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)';
				menu.style.zIndex = '1000';
				menu.style.minWidth = '150px';

				// Add appropriate menu option based on instance state
				if (instanceState === 'running') {
					const stopOption = document.createElement('div');
					stopOption.className = 'context-menu-item';
					stopOption.textContent = 'Stop Instance';
					stopOption.onclick = () => {
						stopInstance(instanceName);
						menu.remove();
					};
					menu.appendChild(stopOption);
				} else if (instanceState === 'stopped') {
					const startOption = document.createElement('div');
					startOption.className = 'context-menu-item';
					startOption.textContent = 'Start Instance';
					startOption.onclick = () => {
						startInstance(instanceName);
						menu.remove();
					};
					menu.appendChild(startOption);
				}

				document.body.appendChild(menu);

				// Close menu when clicking outside
				setTimeout(() => {
					document.addEventListener('click', function closeMenu() {
						menu.remove();
						document.removeEventListener('click', closeMenu);
					});
				}, 0);
			}

			// Listen for messages from the extension
			window.addEventListener('message', event => {
				const message = event.data;
				if (message.command === 'updateInstanceInfo') {
					const detailsDiv = document.getElementById('details-' + message.instanceName);
					if (detailsDiv) {
						detailsDiv.innerHTML = message.html;
					}
				}
			});
		`;
	}

	private static getStyles(): string {
		return `
			body {
				padding: 10px;
				color: var(--vscode-foreground);
				font-family: var(--vscode-font-family);
				font-size: var(--vscode-font-size);
			}
			h2 {
				color: var(--vscode-textLink-foreground);
				margin-top: 0;
				font-size: 14px;
				font-weight: 600;
			}
			ul {
				list-style-type: none;
				padding: 0;
				margin: 0;
			}
			.instance-item {
				padding: 10px;
				margin: 6px 0;
				background: var(--vscode-editor-background);
				border: 1px solid var(--vscode-panel-border);
				border-radius: 4px;
			}
			.instance-item.clickable {
				cursor: pointer;
			}
			.instance-item.clickable:hover {
				background: var(--vscode-list-hoverBackground);
			}
			.instance-item.not-clickable {
				cursor: default;
				opacity: 0.7;
			}
			.instance-header {
				display: flex;
				justify-content: space-between;
				align-items: center;
				margin-bottom: 8px;
			}
			.instance-name {
				font-weight: 600;
				color: var(--vscode-editor-foreground);
				font-size: 13px;
			}
			.state {
				padding: 2px 8px;
				border-radius: 3px;
				font-size: 10px;
				font-weight: 600;
				text-transform: uppercase;
				letter-spacing: 0.5px;
			}
			.state-running {
				background: #4caf50;
				color: white;
			}
			.state-stopped {
				background: #5a5a5a;
				color: white;
			}
			.state-starting,
			.state-stopping {
				background: #ff9800;
				color: white;
				animation: pulse 1.5s ease-in-out infinite;
			}
			@keyframes pulse {
				0%, 100% {
					opacity: 1;
				}
				50% {
					opacity: 0.6;
				}
			}
			.spinner {
				width: 14px;
				height: 14px;
				border: 2px solid var(--vscode-descriptionForeground);
				border-top-color: transparent;
				border-radius: 50%;
				animation: spin 1s linear infinite;
				margin-left: 8px;
			}
			@keyframes spin {
				to {
					transform: rotate(360deg);
				}
			}
			.instance-footer {
				display: flex;
				justify-content: space-between;
				align-items: center;
				font-size: 11px;
				gap: 8px;
			}
			.ip {
				color: var(--vscode-descriptionForeground);
				font-family: var(--vscode-editor-font-family);
				flex: 1;
				text-align: right;
			}
			.instance-release {
				color: var(--vscode-descriptionForeground);
				flex: 1;
				display: flex;
				align-items: center;
				gap: 4px;
			}
			.ubuntu-icon {
				width: 12px;
				height: 12px;
				flex-shrink: 0;
			}
			.version-text {
				font-size: 10px;
			}
			.chevron-container {
				display: flex;
				align-items: center;
				margin-left: 4px;
			}
			.chevron-icon {
				width: 12px;
				height: 12px;
				fill: var(--vscode-descriptionForeground);
				opacity: 0.4;
				transition: transform 0.2s ease, opacity 0.2s ease;
			}
			.instance-item.clickable:hover .chevron-icon {
				opacity: 0.7;
			}
			.no-instances {
				padding: 20px;
				text-align: center;
				color: var(--vscode-descriptionForeground);
			}
			.no-instances p {
				margin-bottom: 20px;
				font-size: 14px;
			}
			.create-instance-btn {
				background: #0e639c;
				color: #ffffff;
				border: 1px solid #1177bb;
				padding: 10px 20px;
				border-radius: 2px;
				cursor: pointer;
				font-size: 13px;
				font-family: var(--vscode-font-family);
				display: inline-flex;
				align-items: center;
				gap: 8px;
				transition: all 0.1s ease;
				box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
			}
			.create-instance-btn:hover {
				background: #1177bb;
				border-color: #1890d5;
			}
			.create-instance-btn:active {
				background: #0d5a8f;
				transform: translateY(1px);
				box-shadow: none;
			}
			.btn-icon {
				font-size: 16px;
				font-weight: bold;
				line-height: 1;
			}
			code {
				background: var(--vscode-textCodeBlock-background);
				padding: 2px 4px;
				border-radius: 3px;
				font-family: var(--vscode-editor-font-family);
			}
			.instance-details {
				margin-top: 12px;
				padding-top: 12px;
				border-top: 1px solid var(--vscode-panel-border);
			}
			.detail-row {
				display: flex;
				justify-content: space-between;
				padding: 4px 0;
				font-size: 11px;
			}
			.detail-label {
				color: var(--vscode-descriptionForeground);
				font-weight: 500;
			}
			.detail-value {
				color: var(--vscode-foreground);
				font-family: var(--vscode-editor-font-family);
				text-align: right;
			}
			.loading {
				text-align: center;
				color: var(--vscode-descriptionForeground);
				font-size: 11px;
				padding: 8px;
			}
			.context-menu-item {
				padding: 6px 12px;
				cursor: pointer;
				color: var(--vscode-menu-foreground);
				font-size: 13px;
			}
			.context-menu-item:hover {
				background: var(--vscode-menu-selectionBackground);
				color: var(--vscode-menu-selectionForeground);
			}
		`;
	}
}
