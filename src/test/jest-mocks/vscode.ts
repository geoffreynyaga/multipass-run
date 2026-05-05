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
	constructor(public fsPath?: string) {}
	static joinPath(..._args: unknown[]): Uri {
		return new Uri();
	}
	static parse(_value: string): Uri {
		return new Uri();
	}
	static file(path: string): Uri {
		return new Uri(path);
	}
}

export const FileType = {
	Unknown: 0,
	File: 1,
	Directory: 2,
	SymbolicLink: 64,
};

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
	fs: {
		readFile: jest.fn(async (uri: Uri) => {
			// eslint-disable-next-line @typescript-eslint/no-require-imports
			const fs = require('fs');
			return fs.promises.readFile((uri as any).fsPath);
		}),
	},
};

export const ConfigurationTarget = { Global: 1, Workspace: 2, WorkspaceFolder: 3 };
