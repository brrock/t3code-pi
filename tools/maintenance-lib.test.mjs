import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  channelReleases, copyPatchSeries, latestSuccessfulSource, loadJson, maintenanceCandidates, manifest,
  missingReleases, record, recordedChannel, releaseTarget, safeReleaseName, saveJson
} from "./maintenance-lib.mjs";

const releases = [
  { tag_name: "v0.0.2-nightly.2", prerelease: true, draft: false, published_at: "2026-01-03T00:00:00Z", target_commitish: "c2" },
  { tag_name: "v0.0.1", prerelease: false, draft: false, published_at: "2026-01-01T00:00:00Z", target_commitish: "a1" },
  { tag_name: "v0.0.2-nightly.1", prerelease: true, draft: false, published_at: "2026-01-02T00:00:00Z", target_commitish: "c1" },
  { tag_name: "v0.0.2", prerelease: false, draft: true, published_at: "2026-01-04T00:00:00Z", target_commitish: "b2" }
];

test("direct Pi baseline records the current-tree base and its patch series", async () => {
  const directory = new URL("../patches/base/current-main-a6797b3b97dca6b6941574ff062d069c45c89b9a/", import.meta.url);
  const baseline = JSON.parse(await readFile(new URL("manifest.json", directory), "utf8"));
  const patches = (await readdir(directory)).filter((name) => name.endsWith(".patch")).sort();
  assert.equal(baseline.sourceCommit, "56c4706c3ca3bc1647180cd8f75deb849319c4ad");
  assert.equal(baseline.baseCommit, "a6797b3b97dca6b6941574ff062d069c45c89b9a");
  assert.equal(baseline.status, "baseline");
  assert.equal(patches.length, 2);
  assert.deepEqual(baseline.patches, patches);
});

test("channels GitHub Releases by prerelease status and published order", () => {
  assert.deepEqual(channelReleases(releases, false).map((release) => release.tag_name), ["v0.0.1"]);
  assert.deepEqual(channelReleases(releases, true).map((release) => release.tag_name), ["v0.0.2-nightly.1", "v0.0.2-nightly.2"]);
  assert.deepEqual(missingReleases(channelReleases(releases, true), { releases: { "v0.0.2-nightly.1": {} } }).map((release) => release.tag_name), ["v0.0.2-nightly.2"]);
});

test("uses the immutable release tag rather than a moving target branch", () => {
  assert.equal(releaseTarget({ tag_name: "v0.0.0-alpha.3", target_commitish: "main" }), "v0.0.0-alpha.3");
});

test("selects the latest upstream release even when its manifest already exists", () => {
  const channel = channelReleases(releases, true);
  assert.deepEqual(maintenanceCandidates(channel, { releases: {} }, true).map((release) => release.tag_name), ["v0.0.2-nightly.2"]);
  assert.deepEqual(
    maintenanceCandidates(channel, { releases: { "v0.0.2-nightly.2": { status: "deferred" } } }, true).map((release) => release.tag_name),
    ["v0.0.2-nightly.2"],
  );
  assert.deepEqual(maintenanceCandidates(channel, { releases: {} }, false).map((release) => release.tag_name), ["v0.0.2-nightly.1", "v0.0.2-nightly.2"]);
});

test("refuses release tags that could escape a patch directory", () => {
  assert.equal(safeReleaseName("v0.0.2-nightly.1"), "v0.0.2-nightly.1");
  assert.throws(() => safeReleaseName("../oops"));
});

test("carries only ordered patch files forward", async () => {
  const root = await mkdtemp(join(tmpdir(), "t3code-pi-"));
  const source = join(root, "source");
  const destination = join(root, "destination");
  await saveJson(join(source, "manifest.json"), { ignored: true });
  await writeFile(join(source, "0002-second.patch"), "two");
  await writeFile(join(source, "0001-first.patch"), "one");
  assert.deepEqual(await copyPatchSeries(source, destination), ["0001-first.patch", "0002-second.patch"]);
  assert.equal(await readFile(join(destination, "0001-first.patch"), "utf8"), "one");
  assert.deepEqual(await loadJson(join(destination, "manifest.json"), null), null);
});

test("reconstructs completed release history from committed manifests", async () => {
  const root = await mkdtemp(join(tmpdir(), "t3code-pi-history-"));
  await saveJson(join(root, "patches/nightly/old/manifest.json"), { channel: "nightly", tag: "old", status: "applied", targetCommitish: "abc", patches: ["0001.patch"] });
  await saveJson(join(root, "patches/nightly/waiting/manifest.json"), { channel: "nightly", tag: "waiting", status: "deferred", targetCommitish: "def" });
  await saveJson(join(root, "patches/nightly/conflict/manifest.json"), { channel: "nightly", tag: "conflict", status: "conflict" });
  assert.deepEqual(await recordedChannel(root, "nightly"), { releases: {
    old: { status: "applied", patchDirectory: "patches/nightly/old", targetCommitish: "abc", publishedAt: null, patches: ["0001.patch"], reason: null },
    waiting: { status: "deferred", patchDirectory: "patches/nightly/waiting", targetCommitish: "def", publishedAt: null, patches: [], reason: null }
  } });
});

test("uses the latest successful series, persists state, and describes a release immutably", async () => {
  const state = { schemaVersion: 1, channels: { nightly: { releases: {
    old: { status: "applied", patchDirectory: "patches/nightly/old" },
    blocked: { status: "conflict", patchDirectory: "patches/nightly/blocked" }
  } } } };
  assert.equal(latestSuccessfulSource(state.channels.nightly, "baseline"), "patches/nightly/old");
  record(state, "nightly", "new", { status: "deferred" });
  assert.equal(state.channels.nightly.releases.new.status, "deferred");
  const root = await mkdtemp(join(tmpdir(), "t3code-pi-state-"));
  await saveJson(join(root, "state.json"), state);
  assert.deepEqual(await loadJson(join(root, "state.json")), state);
  assert.deepEqual(manifest({ channel: "nightly", release: releases[0], source: "patches/nightly/old", status: "applied", patches: ["0001.patch"], requiredCommit: "abc" }), {
    schemaVersion: 1, channel: "nightly", upstream: "pingdotgg/t3code", tag: "v0.0.2-nightly.2", targetCommitish: "v0.0.2-nightly.2", publishedAt: "2026-01-03T00:00:00Z", source: "patches/nightly/old", requiredCommit: "abc", status: "applied", reason: null, patches: ["0001.patch"]
  });
});
