// eslint.config.mjs
import tseslint from "typescript-eslint";
import js from "@eslint/js";
import prettierConfig from "eslint-config-prettier";
import prettierPlugin from "eslint-plugin-prettier";

export default tseslint.config(
	{
		...js.configs.recommended,
	},

	...tseslint.configs.strictTypeChecked,

	// 3. Configuration to correctly link your project for type-aware rules.
	// `tseslint.config` is smart and will find your tsconfig.json automatically.
	// This block is for fine-tuning if needed.
	{
		languageOptions: {
			parserOptions: {
				project: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
	},

	// 4. Prettier configuration. MUST BE LAST.
	// This turns off ESLint rules that conflict with Prettier.
	prettierConfig,

	// This enables the Prettier plugin and reports formatting issues as errors.
	{
		plugins: {
			prettier: prettierPlugin,
		},
		rules: {
			"prettier/prettier": ["error", {}],
		},
	},
	{
		rules: {
			"@typescript-eslint/no-this-alias": "off",
		}
	}
);
