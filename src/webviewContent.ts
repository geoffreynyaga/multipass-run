import * as vscode from 'vscode';

import { InstanceLists } from './multipassService';

export class WebviewContent {
	public static getHtml(instanceLists: InstanceLists, webview: vscode.Webview, extensionUri: vscode.Uri): string {
		// Get the URI for the React webview bundle
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'dist', 'webview.js'));

		// Get URIs for Ubuntu icons
		const ubuntuIconUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'distros', 'ubuntu.svg'));
		const ubuntuDarkIconUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'distros', 'ubuntu-dark.svg'));
		const extensionIconUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'icon.svg'));

		// Use a nonce to only allow specific scripts to be run
		const nonce = getNonce();

		console.log('Script URI:', scriptUri.toString());
		console.log('Extension URI:', extensionUri.toString());

		return `<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'nonce-${nonce}'; img-src ${webview.cspSource} data:;">
			<title>Multipass Instances</title>
			<style>
				body {
					color: white;
					font-family: 'Ubuntu', var(--vscode-font-family), system-ui, -apple-system, sans-serif;
					padding: 10px;
				}
			</style>
		</head>
		<body>
			<noscript>You need to enable JavaScript to run this app.</noscript>
			<div id="root">Loading Multipass Run...</div>
			<script nonce="${nonce}">
				console.log('Webview HTML loaded');
				console.log('Script will be loaded from:', '${scriptUri}');
				console.log('Initial state:', ${JSON.stringify(instanceLists)});
				// Initialize state for the React app
				window.initialState = ${JSON.stringify(instanceLists)};
				window.ubuntuIconUri = '${ubuntuIconUri}';
				window.ubuntuDarkIconUri = '${ubuntuDarkIconUri}';
				window.extensionIconUri = '${extensionIconUri}';
			</script>
			<script nonce="${nonce}" src="${scriptUri}" onerror="console.error('Failed to load script from: ${scriptUri}')"></script>
			<script nonce="${nonce}">
				console.log('Script tag executed (may or may not have loaded successfully)');
			</script>
		</body>
		</html>`;
	}
}

function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}
