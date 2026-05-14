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
}];