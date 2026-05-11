import type { HandlerContext } from './context';

export async function handleCancelPendingLaunch(msg: { instanceName: string }, ctx: HandlerContext): Promise<void> {
	await ctx.pendingStore.remove(msg.instanceName);
	await ctx.refresh();
}

export async function handleClearPendingLaunch(msg: { instanceName?: string }, ctx: HandlerContext): Promise<void> {
	if (typeof msg.instanceName === 'string') {
		await ctx.pendingStore.remove(msg.instanceName);
	} else {
		await ctx.pendingStore.clear();
	}
	await ctx.refresh();
}

export async function handleRetryPendingLaunch(msg: { instanceName: string }, ctx: HandlerContext): Promise<void> {
	await ctx.pendingStore.remove(msg.instanceName);
	await ctx.refresh();
	await ctx.createDefaultInstance();
}
