import { MultipassInstanceInfo } from '../multipassService';

export class InstanceInfoView {
	public static generateHtml(info: MultipassInstanceInfo): string {
		return `
			<div class="detail-row">
				<span class="detail-label">Zone:</span>
				<span class="detail-value">${info.zone}</span>
			</div>
			<div class="detail-row">
				<span class="detail-label">Snapshots:</span>
				<span class="detail-value">${info.snapshots}</span>
			</div>
			<div class="detail-row">
				<span class="detail-label">CPU(s):</span>
				<span class="detail-value">${info.cpus}</span>
			</div>
			<div class="detail-row">
				<span class="detail-label">Load:</span>
				<span class="detail-value">${info.load}</span>
			</div>
			<div class="detail-row">
				<span class="detail-label">Disk Usage:</span>
				<span class="detail-value">${info.diskUsage}</span>
			</div>
			<div class="detail-row">
				<span class="detail-label">Memory Usage:</span>
				<span class="detail-value">${info.memoryUsage}</span>
			</div>
			<div class="detail-row">
				<span class="detail-label">Mounts:</span>
				<span class="detail-value">${info.mounts}</span>
			</div>
		`;
	}
}
