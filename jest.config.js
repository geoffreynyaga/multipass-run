/** @type {import('jest').Config} */
module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	roots: ['<rootDir>/src'],
	testMatch: ['**/__tests__/**/*.spec.ts', '**/__tests__/**/*.spec.tsx', '**/?(*.)+(spec).ts', '**/?(*.)+(spec).tsx'],
	moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
	transform: {
		'^.+\\.tsx?$': [
			'ts-jest',
			{
				tsconfig: {
					module: 'commonjs',
					target: 'ES2022',
					jsx: 'react-jsx',
					esModuleInterop: true,
					strict: true,
					skipLibCheck: true,
					lib: ['ES2022', 'DOM'],
				},
			},
		],
	},
	moduleNameMapper: {
		'^vscode$': '<rootDir>/src/test/jest-mocks/vscode.ts',
	},
	clearMocks: true,
};
