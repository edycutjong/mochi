// Flat config for the Decentraland scene.
//
// `.mjs` rather than `.js` because this package has no `"type": "module"`, and
// adding one to a package whose build is driven by `sdk-commands` is a change
// with more blast radius than the warning it silences.
//
// Type-aware linting is scoped to `src/`, deliberately. It is the only tree the
// scene tsconfig has a program for, and it is the only code that ships. The
// rules that earn their place are the promise ones: a scene runs inside the
// Decentraland client, where an unhandled rejection produces no visible error —
// it just quietly stops being a creature.
import js from '@eslint/js'
import tseslint from 'typescript-eslint'

const namingRules = {
  '@typescript-eslint/no-unused-vars': [
    'error',
    {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      caughtErrorsIgnorePattern: '^_',
    },
  ],
}

export default tseslint.config(
  {
    // bin/ is the SDK's bundled output and dclcontext/ is SDK reference material
    // regenerated on every npm install — neither is ours. server/ has its own
    // config with its own tsconfig, and linting it from here would use the wrong
    // program.
    ignores: [
      'bin/**',
      'dist/**',
      'node_modules/**',
      'dclcontext/**',
      'server/**',
      'assets/**',
      'coverage/**',
      '*.js',
      '*.mjs',
    ],
  },

  js.configs.recommended,

  {
    // The shipped scene. Full type-aware ruleset.
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    extends: [...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      ...namingRules,
    },
  },

  {
    // The submission-readiness gate. Syntax-only rules: it is a standalone
    // Node script and sits outside the scene tsconfig's `include` on purpose —
    // pulling it in would make `sdk-commands build` typecheck Node built-ins
    // the scene has no types for.
    files: ['scripts/**/*.ts'],
    extends: [...tseslint.configs.recommended],
    rules: namingRules,
  },
)
