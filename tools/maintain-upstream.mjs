#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import {
  applyAndExport, channelReleases, checkoutRelease, copyPatchSeries, ensureClone, hasCommit,
  latestSuccessfulSource, loadJson, maintenanceCandidates, manifest, patchDirectory, patchFiles, record,
  recordedChannel, relative, releaseTarget, saveJson, statePath, writeManifest
} from "./maintenance-lib.mjs";

const root = resolve(import.meta.dirname, "..");
const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const latestOnly = args.has("--latest-only");
const requestedChannel = [...args].find((arg) => arg.startsWith("--channel="))?.slice(10) ?? "all";
if (!["all", "stable", "nightly"].includes(requestedChannel)) throw new Error("--channel must be stable, nightly, or all");
const config = await loadJson(join(root, "maintenance.config.json"));
const state = await loadJson(join(root, statePath), { schemaVersion: 1, channels: {} });

function githubReleases() {
  // Release assets make the raw API response exceed Node's default process buffer.
  // Keep only the immutable release fields that patch maintenance needs.
  const result = execFileSync(
    "gh",
    ["api", "--paginate", `repos/${config.upstream}/releases?per_page=100`, "--jq", ".[] | {tag_name, target_commitish, draft, prerelease, created_at, published_at}"],
    { encoding: "utf8", maxBuffer: 4 * 1024 * 1024 },
  );
  return result.trim() ? result.trim().split("\n").map((line) => JSON.parse(line)) : [];
}

const releases = githubReleases();
for (const [channel, channelConfig] of Object.entries(config.channels)) {
  if (requestedChannel !== "all" && requestedChannel !== channel) continue;
  const recorded = await recordedChannel(root, channel);
  state.channels ??= {};
  state.channels[channel] ??= { releases: {} };
  Object.assign(state.channels[channel].releases, recorded.releases);
  let known = state.channels[channel];
  for (const release of maintenanceCandidates(channelReleases(releases, channelConfig.preRelease), known, latestOnly)) {
    const destination = patchDirectory(root, channel, release.tag_name);
    const previousConflict = await loadJson(join(destination, "manifest.json"), null);
    const source = previousConflict?.status === "conflict"
      ? relative(root, destination)
      : latestSuccessfulSource(known, channelConfig.baseline);
    const sourceName = source ?? null;
    if (dryRun) {
      console.log(`${channel} ${release.tag_name}: would carry forward patches from ${sourceName ?? "no Pi baseline"}`);
      continue;
    }
    const copied = previousConflict?.status === "conflict"
      ? await patchFiles(destination)
      : await copyPatchSeries(source && join(root, source), destination);
    const base = { channel, release, source: sourceName, requiredCommit: channelConfig.requiresCommit, patches: copied };

    if (!channelConfig.baseline) {
      const data = manifest({ ...base, status: "deferred", reason: channelConfig.policy });
      await writeManifest(destination, data);
      record(state, channel, release.tag_name, { status: data.status, patchDirectory: relative(root, destination), targetCommitish: data.targetCommitish, publishedAt: data.publishedAt, reason: data.reason });
      known = state.channels[channel];
      console.log(`${channel} ${release.tag_name}: deferred (${data.reason})`);
      continue;
    }
    await mkdir(dirname(join(root, channelConfig.clone)), { recursive: true });
    const clone = ensureClone(root, channelConfig.clone);
    const baseCommit = checkoutRelease(clone, release);
    if (!hasCommit(clone, channelConfig.requiresCommit)) {
      const data = manifest({ ...base, status: "deferred", reason: channelConfig.policy });
      await writeManifest(destination, data);
      record(state, channel, release.tag_name, { status: data.status, patchDirectory: relative(root, destination), targetCommitish: data.targetCommitish, publishedAt: data.publishedAt, reason: data.reason });
      known = state.channels[channel];
      console.log(`${channel} ${release.tag_name}: deferred (missing direct Pi base)`);
      continue;
    }
    try {
      const patches = await applyAndExport(clone, destination, baseCommit);
      const data = manifest({ ...base, status: "applied", patches });
      await writeManifest(destination, data);
      record(state, channel, release.tag_name, { status: data.status, patchDirectory: relative(root, destination), targetCommitish: data.targetCommitish, publishedAt: data.publishedAt, patches });
      known = state.channels[channel];
      console.log(`${channel} ${release.tag_name}: applied ${patches.length} patches`);
    } catch (error) {
      const data = manifest({ ...base, status: "conflict", reason: error.message });
      await writeManifest(destination, data);
      // Deliberately do not record conflicts as handled: the next agent run must resolve it.
      console.error(`${channel} ${release.tag_name}: conflict; see ${relative(root, destination)}/manifest.json`);
      process.exitCode = 1;
      break;
    }
  }
}
if (!dryRun) await saveJson(join(root, statePath), state);
