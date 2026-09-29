import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

export default [
  {
    files: ["src/**/*.ts"],
    ignores: ["src/security/vault.ts", "src/security/kms.ts", "src/security/crypto.ts", "src/test/**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/security/kms*", "**/security/crypto*"],
              importNames: ["decrypt", "decryptWithAad", "unwrapKey", "SecretsManagerKmsAdapter"],
              message: "Direct decryption is restricted. Only security/vault.ts and security/kms.ts may perform decryption.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/routes/**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@octokit/rest",
              message: "Routes must not call GitHub directly. Follow the layering: routes -> services -> github gateway.",
            },
            {
              name: "../github/client.js",
              message: "Routes must not call the GitHub client directly. Call a service instead.",
            },
          ],
        },
      ],
    },
  },
];
