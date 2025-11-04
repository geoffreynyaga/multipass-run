import { MultipassInstance, MultipassInstanceInfo } from './multipassService';
import { InstanceListView } from './views/instanceListView';
import { InstanceInfoView } from './views/instanceInfoView';

export class WebviewContent {
	public static getHtml(instances: MultipassInstance[]): string {
		const instancesHtml = InstanceListView.generateHtml(instances);

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
				<h2>Multipass Instances</h2>
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
				background: #f44336;
				color: white;
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
		`;
	}
}
