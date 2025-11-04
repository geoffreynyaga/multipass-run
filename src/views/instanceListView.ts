import { MultipassInstance } from '../multipassService';

export class InstanceListView {
	public static generateHtml(instances: MultipassInstance[]): string {
		if (instances.length === 0) {
			return '<li class="no-instances">No instances found. Run <code>multipass launch</code> to create one.</li>';
		}

		return instances.map(instance => {
			const isRunning = instance.state.toLowerCase() === 'running';
			const clickHandler = isRunning ? `onclick="handleInstanceClick('${instance.name}')"` : '';
			const cursorClass = isRunning ? 'clickable' : 'not-clickable';

			return `
			<li class="instance-item ${cursorClass}" data-instance-name="${instance.name}" ${clickHandler}>
				<div class="instance-header">
					<div class="instance-name">${instance.name}</div>
					<span class="state state-${instance.state.toLowerCase()}">${instance.state}</span>
				</div>
				<div class="instance-footer">
					<span class="instance-release">${instance.release}</span>
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
