import { MultipassInstance } from './multipassService';

export class WebviewContent {
	public static getHtml(instances: MultipassInstance[]): string {
		const instancesHtml = this.generateInstancesList(instances);

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
				<ul>
					${instancesHtml}
				</ul>
			</div>
		</body>
		</html>`;
	}

	private static generateInstancesList(instances: MultipassInstance[]): string {
		if (instances.length === 0) {
			return '<li class="no-instances">No instances found. Run <code>multipass launch</code> to create one.</li>';
		}

		return instances.map(instance => `
			<li class="instance-item">
				<div class="instance-header">
					<div class="instance-name">${instance.name}</div>
					<span class="state state-${instance.state.toLowerCase()}">${instance.state}</span>
				</div>
				<div class="instance-footer">
					<span class="instance-release">${instance.release}</span>
					<span class="ip">${instance.ipv4}</span>
				</div>
			</li>
		`).join('');
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
				cursor: pointer;
			}
			.instance-item:hover {
				background: var(--vscode-list-hoverBackground);
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
			}
			.ip {
				color: var(--vscode-descriptionForeground);
				font-family: var(--vscode-editor-font-family);
			}
			.instance-release {
				color: var(--vscode-descriptionForeground);
				text-align: right;
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
		`;
	}
}
