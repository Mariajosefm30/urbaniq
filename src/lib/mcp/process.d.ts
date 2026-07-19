// Ambient declaration so tool source files (bundled to Deno at build time)
// typecheck under the Vite/browser tsconfig.
declare const process: { env: Record<string, string | undefined> };
