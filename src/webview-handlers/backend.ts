import { getBackendSupport } from '../shared/backendCapabilities';
import type { HandlerContext } from './context';

/** Re-read the actual backend before an operation; cached webview state may be stale. */
export async function backendActionError(feature: 'snapshots' | 'suspend', ctx: HandlerContext): Promise<string | undefined> {
	try {
		const support = getBackendSupport(await ctx.inspectEnvironment());
		if (support[feature] === true) {
			return undefined;
		}
		return feature === 'snapshots' ? support.snapshotReason : support.suspendReason;
	} catch {
		return 'Unable to check backend support. Run Show Environment and retry.';
	}
}
