/**
 * Utility functions for determining font families based on distribution
 */

export function getDistributionFont(release: string): string {
	const releaseLower = release.toLowerCase();

	if (releaseLower.includes('ubuntu')) {
		return 'Ubuntu, system-ui, -apple-system, sans-serif';
	} else if (releaseLower.includes('fedora') || releaseLower.includes('red hat') || releaseLower.includes('rhel')) {
		return 'Red Hat Display, Overpass, system-ui, -apple-system, sans-serif';
	} else if (releaseLower.includes('debian')) {
		return 'Noto Sans, system-ui, -apple-system, sans-serif';
	} else if (releaseLower.includes('arch')) {
		return 'Inter, system-ui, -apple-system, sans-serif';
	} else if (releaseLower.includes('centos')) {
		return 'Red Hat Display, system-ui, -apple-system, sans-serif';
	} else if (releaseLower.includes('alpine')) {
		return 'Inter, system-ui, -apple-system, sans-serif';
	}

	// Default fallback
	return 'Inter, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif';
}

export function getMonoFont(): string {
	return 'JetBrains Mono, Fira Code, Consolas, Monaco, Courier New, monospace';
}

export function getDistributionFontClass(release: string): string {
	const releaseLower = release.toLowerCase();

	if (releaseLower.includes('ubuntu')) {
		return 'font-ubuntu';
	} else if (releaseLower.includes('fedora') || releaseLower.includes('red hat') || releaseLower.includes('rhel')) {
		return 'font-fedora';
	} else if (releaseLower.includes('debian')) {
		return 'font-debian';
	}

	return 'font-default';
}
