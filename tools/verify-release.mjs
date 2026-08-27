#!/usr/bin/env node
import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { join, resolve } from "node:path";

const [channel, upstreamTag] = process.argv.slice(2);
if (!channel || !upstreamTag || !["stable", "nightly"].includes(channel) || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(upstreamTag)) {
  throw new Error("Usage: node tools/verify-release.mjs <stable|nightly> <safe-upstream-tag>");
}
const root = resolve(import.meta.dirname, "..");
const directory = join(root, "patches", channel, upstreamTag);
const manifest = JSON.parse(await readFile(join(directory, "manifest.json"), "utf8"));
if (manifest.channel !== channel || manifest.tag !== upstreamTag) throw new Error("Release manifest does not match the requested channel and upstream tag.");
if (manifest.status !== "applied") throw new Error(`${channel} Pi release requires an applied patch series, not a deferred or conflicted manifest.`);
for (const patch of manifest.patches) await access(join(directory, patch), constants.R_OK);
console.log(`Verified ${channel} release for ${upstreamTag}: ${manifest.status}`);
