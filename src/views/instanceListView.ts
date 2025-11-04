import { MultipassInstance } from '../multipassService';

export class InstanceListView {
	public static generateHtml(instances: MultipassInstance[], ubuntuIconUri: string, ubuntuDarkIconUri: string): string {
		if (instances.length === 0) {
			return `
				<div class="no-instances">
					<p>No instances found.</p>
					<button class="create-instance-btn" onclick="createNewInstance()">
						Create New Instance
					</button>
				</div>
			`;
		}

		return instances.map(instance => {
			const isRunning = instance.state.toLowerCase() === 'running';
			const clickHandler = isRunning ? `onclick="handleInstanceClick('${instance.name}')"` : '';
			const cursorClass = isRunning ? 'clickable' : 'not-clickable';

			// Remove "Ubuntu" prefix from release (e.g., "Ubuntu 24.04 LTS" -> "24.04 LTS")
			const releaseText = instance.release.replace(/^Ubuntu\s*/i, '');

			// Use dark icon for stopped instances, regular icon for running instances
			const iconUri = isRunning ? ubuntuIconUri : ubuntuDarkIconUri;

		return `
		<li class="instance-item ${cursorClass}" data-instance-name="${instance.name}" ${clickHandler}>
			<div class="instance-header">
				<div class="instance-name">${instance.name}</div>
				<div class="state-container">
					<span class="state state-${instance.state.toLowerCase()}">${instance.state}</span>
				</div>
			</div>
			<div class="instance-footer">
				<div class="instance-release">
					<img src="${iconUri}" class="ubuntu-icon" alt="Ubuntu" />
					<span class="version-text">${releaseText}</span>
				</div>
				<span class="ip">${instance.ipv4}</span>
					${isRunning ? `
					<div class="chevron-container" id="chevron-${instance.name}">
						<svg class="chevron-icon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
							<path d="M8 11L3 6h10z"/>
						</svg>
					</div>
					` : ''}
				</div>
				${isRunning ? `
				<div class="instance-details" id="details-${instance.name}" style="display: none;">
					<div class="loading">Loading details...</div>
				</div>` : ''}
			</li>
		`;
		}).join('');
	}
}
