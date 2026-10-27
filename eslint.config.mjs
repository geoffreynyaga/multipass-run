import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import unusedImports from "eslint-plugin-unused-imports";

export default [{
    files: ["**/*.ts", "**/*.tsx"],
}, {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: {
        "@typescript-eslint": typescriptEslint,
        "simple-import-sort": simpleImportSort,
        "unused-imports": unusedImports,
    },

    languageOptions: {
        parser: tsParser,
        ecmaVersion: 2022,
        sourceType: "module",
    },

    rules: {
        "@typescript-eslint/naming-convention": ["warn", {
            selector: "import",
            format: ["camelCase", "PascalCase"],
        }],

        curly: "warn",
        eqeqeq: "warn",
        "no-throw-literal": "warn",
        semi: "warn",

        // Drop unused imports (auto-fixable). Pair with `no-unused-vars: off`
        // so the two rules don't fight over the same nodes.
        "unused-imports/no-unused-imports": "warn",

        // Sort import statements across the file (auto-fixable). The plugin's
        // default groupings handle node:/external/internal/relative buckets.
        "simple-import-sort/imports": "warn",
        "simple-import-sort/exports": "warn",
    },
}, {
    // The webview runs in a browser. It may import extension code for types
    // only; shared runtime values live in src/shared/.
    files: ["src/webview/**/*.ts", "src/webview/**/*.tsx"],
    rules: {
        "@typescript-eslint/no-restricted-imports": ["error", {
            paths: ["vscode", "child_process", "fs", "os", "path"].map((name) => ({
                name,
                message: "Node and VS Code modules are not available in the webview.",
            })),
            patterns: [{
                group: [
                    "**/multipassService",
                    "**/MultipassViewProvider",
                    "**/commands/**",
                    "**/config/**",
                    "**/extension-utils/**",
                    "**/webview-handlers/**",
                    "**/utils/*",
                    "!**/utils/fontUtils",
                ],
                allowTypeImports: true,
                message: "Import types only from extension code. Put shared values in src/shared/.",
            }],
        }],
    },
}];