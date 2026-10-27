import type { WebviewMessage } from '../../shared/messages';
import type { HandlerContext } from '../context';
import { createMessageDispatcher } from '../index';

function fakeContext(): HandlerContext {
	return { refresh: jest.fn(async () => undefined) } as unknown as HandlerContext;
}

describe('createMessageDispatcher', () => {
	it('routes a known command to its handler', async () => {
		const ctx = fakeContext();
		await createMessageDispatcher(ctx)({ command: 'refreshList' });
		expect(ctx.refresh).toHaveBeenCalledTimes(1);
	});

	it('warns on an unknown command instead of failing silently', async () => {
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
		const message = { command: 'refreshLsit' } as unknown as WebviewMessage;
		await createMessageDispatcher(fakeContext())(message);
		expect(warn).toHaveBeenCalledWith('Unknown webview command:', 'refreshLsit');
	});

	it('rejects a misspelled command at compile time', () => {
		// @ts-expect-error 'refreshLsit' is not a WebviewCommand
		const message: WebviewMessage = { command: 'refreshLsit' };
		expect(message.command).toBe('refreshLsit');
	});
});
