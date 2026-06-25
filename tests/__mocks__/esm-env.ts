// Svelte's client runtime gates user-effects on esm-env's `BROWSER`. Under
// Node it resolves to `false`, which strips `$effect`. Alias esm-env to this
// stub (see vite.config.mjs) so rune effects run under the `svelte` vitest
// project. No real DOM is needed — effects don't touch window/document.
export const BROWSER = true;
export const DEV = false;
export const NODE = false;
