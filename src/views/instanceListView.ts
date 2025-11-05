import { MultipassInstance, InstanceLists } from '../multipassService';

export class InstanceListView {
	public static generateHtml(instanceLists: InstanceLists, ubuntuIconUri: string, ubuntuDarkIconUri: string): string {
		const { active, deleted } = instanceLists;
		
		let html = '';
		
		// Show "no instances" message only if both lists are empty
		if (active.length === 0 && deleted.length === 0) {
			return `
				<div class="no-instances">
					<p>No instances found.</p>
					<button class="create-instance-btn" onclick="createNewInstance()">
						Create New Instance
					</button>
				</div>
			`;
		}
		
		// Active instances
		if (active.length > 0) {
			html += active.map(instance => this.generateActiveInstanceCard(instance, ubuntuIconUri, ubuntuDarkIconUri)).join('');
		}
		
		// Separator and deleted instances section
		if (deleted.length > 0) {
			html += `
				<li class="separator">
					<div class="separator-line"></div>
					<span class="separator-text">DELETED INSTANCES</span>
					<div class="separator-line"></div>
				</li>
			`;
			html += deleted.map(instance => this.generateDeletedInstanceCard(instance, ubuntuDarkIconUri)).join('');
		}
		
		return html;
	}
	
	private static generateActiveInstanceCard(instance: MultipassInstance, ubuntuIconUri: string, ubuntuDarkIconUri: string): string {
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
	}
	
	private static generateDeletedInstanceCard(instance: MultipassInstance, ubuntuDarkIconUri: string): string {
		const releaseText = instance.release.replace(/^Ubuntu\s*/i, '');
		
		return `
		<li class="instance-item deleted-instance" data-instance-name="${instance.name}">
			<div class="instance-header">
				<div class="instance-name">${instance.name}</div>
				<div class="state-container">
					<span class="state state-deleted">Deleted</span>
				</div>
			</div>
			<div class="instance-footer">
				<div class="instance-release">
					<img src="${ubuntuDarkIconUri}" class="ubuntu-icon" alt="Ubuntu" />
					<span class="version-text">${releaseText}</span>
				</div>
			</div>
		</li>
		`;
	}
}
