export const window = {
	showInformationMessage: jest.fn(),
	showWarningMessage: jest.fn(),
	showErrorMessage: jest.fn(),
	showInputBox: jest.fn(),
	showQuickPick: jest.fn(),
	createTerminal: jest.fn(),
	withProgress: jest.fn(async (_opts: unknown, fn: (progress: { report: jest.Mock }) => unknown) => fn({ report: jest.fn() })),
	registerWebviewViewProvider: jest.fn(),
	onDidCloseTerminal: jest.fn(),
};

export const commands = {
	registerCommand: jest.fn(),
	executeCommand: jest.fn(),
};

export const env = {
	openExternal: jest.fn(),
};

export class Uri {
	static joinPath(..._args: unknown[]): Uri {
		return new Uri();
	}
	static parse(_value: string): Uri {
		return new Uri();
	}
}

export const ProgressLocation = { Notification: 15 };
export const QuickPickItemKind = { Separator: -1, Default: 0 };

export const extensions = {
	getExtension: jest.fn(),
};

export const workspace = {
	getConfiguration: jest.fn().mockReturnValue({
		get: jest.fn(),
		update: jest.fn(),
	}),
};

export const ConfigurationTarget = { Global: 1, Workspace: 2, WorkspaceFolder: 3 };
