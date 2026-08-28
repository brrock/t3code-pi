#!/usr/bin/env node
/**
 * Applies the fork identity to a temporary, already patched upstream checkout.
 * This deliberately does not mutate patch history: the identity is release
 * infrastructure, while patches remain a clean upstream-portable Pi series.
 */
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

const [sourceArgument] = process.argv.slice(2);
if (!sourceArgument) throw new Error("Usage: node tools/prepare-release-source.mjs <patched-source-directory>");
const root = resolve(import.meta.dirname, "..");
const source = resolve(sourceArgument);
const config = JSON.parse(await readFile(join(root, "release.config.json"), "utf8"));
for (const key of ["githubRepository", "npmPackage", "desktopAppId", "desktopProductName"]) {
  if (typeof config[key] !== "string" || !config[key]) throw new Error(`release.config.json requires ${key}`);
}
if (!/^(?:@[-a-z0-9~][a-z0-9~._-]*\/)?[a-z0-9~][a-z0-9~._-]*$/i.test(config.npmPackage)) {
  throw new Error("npmPackage must be a valid npm package name");
}

async function replace(path, from, to) {
  const content = await readFile(path, "utf8");
  if (!content.includes(from)) throw new Error(`Expected release-source marker missing: ${path}: ${from}`);
  await writeFile(path, content.replaceAll(from, to));
}

const serverPackagePath = join(source, "apps/server/package.json");
const serverPackage = JSON.parse(await readFile(serverPackagePath, "utf8"));
serverPackage.name = config.npmPackage;
serverPackage.repository.url = `https://github.com/${config.githubRepository}`;
await writeFile(serverPackagePath, `${JSON.stringify(serverPackage, null, 2)}\n`);

await replace(
  join(source, "apps/server/scripts/cli.ts"),
  '"--filter",\n    "t3",',
  `"--filter",\n    "${config.npmPackage}",`,
);

const runtimePath = join(source, "apps/server/src/cloud/pinnedRuntime.ts");
let runtime = await readFile(runtimePath, "utf8");
if (!runtime.includes('"node_modules", "t3", "dist", "bin.mjs"') || !runtime.includes('`t3@${input.version}`')) {
  throw new Error("Pinned runtime implementation changed; update prepare-release-source.mjs");
}
const packagePathSegments = config.npmPackage.split("/").map((segment) => `"${segment}"`).join(", ");
runtime = runtime
  .replaceAll('`t3@<version>`', `\`${config.npmPackage}@<version>\``)
  .replaceAll('"node_modules", "t3", "dist", "bin.mjs"', `"node_modules", ${packagePathSegments}, "dist", "bin.mjs"`)
  .replaceAll('`t3@${input.version}`', `\`${config.npmPackage}@\${input.version}\``);
await writeFile(runtimePath, runtime);

await replace(
  join(source, "scripts/build-desktop-artifact.ts"),
  'const DESKTOP_APP_ID = "com.t3tools.t3code";',
  `const DESKTOP_APP_ID = "${config.desktopAppId}";`,
);
await replace(
  join(source, "apps/desktop/package.json"),
  '"productName": "T3 Code (Alpha)"',
  `"productName": "${config.desktopProductName}"`,
);

await replace(
  join(source, "apps/desktop/vite.config.ts"),
  "t3#build",
  `${config.npmPackage}#build`,
);

// Unsigned macOS downloads can retain the quarantine extended attribute after
// Squirrel installs them. This is deliberately best-effort: it runs only once
// the replacement has launched, never touches files outside this app bundle,
// and does not make an initially Gatekeeper-blocked application executable.
const desktopMainPath = join(source, "apps/desktop/src/main.ts");
let desktopMain = await readFile(desktopMainPath, "utf8");
const desktopMainMarker = 'import * as NodeHttpClient from "@effect/platform-node/NodeHttpClient";';
if (!desktopMain.includes(desktopMainMarker)) {
  throw new Error("Desktop main implementation changed; update prepare-release-source.mjs");
}
desktopMain = desktopMain.replace(
  desktopMainMarker,
  `import { execFile } from "node:child_process";\nimport * as NodePath from "node:path";\n\nif (process.platform === "darwin" && process.execPath.includes(".app/Contents/MacOS/")) {\n  const appBundlePath = NodePath.resolve(process.execPath, "..", "..", "..");\n  execFile("/usr/bin/xattr", ["-dr", "com.apple.quarantine", appBundlePath], () => {});\n}\n\n${desktopMainMarker}`,
);
await writeFile(desktopMainPath, desktopMain);

// Persist the identity used by release debugging without placing it in the app bundle.
await writeFile(join(source, ".t3code-pi-release.json"), `${JSON.stringify({ ...config, source: dirname(source) }, null, 2)}\n`);
console.log(`Prepared ${source} for ${config.npmPackage} and ${config.githubRepository}.`);
