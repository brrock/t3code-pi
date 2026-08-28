import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

export const statePath = ".state/releases.json";

export function channelReleases(releases, preRelease) {
  return releases
    .filter((release) => !release.draft && release.prerelease === preRelease)
    .sort((a, b) => new Date(a.published_at ?? a.created_at) - new Date(b.published_at ?? b.created_at));
}

export function safeReleaseName(tag) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(tag)) throw new Error(`Unsafe release tag: ${tag}`);
  return tag;
}

export function missingReleases(releases, channelState) {
  const done = new Set(Object.keys(channelState?.releases ?? {}));
  return releases.filter((release) => !done.has(release.tag_name));
}

export function maintenanceCandidates(releases, channelState, latestOnly = false) {
  // Latest-only maintenance intentionally revisits the newest immutable release
  // even when it has a deferred/conflict manifest, so a user can retry it.
  return latestOnly ? releases.slice(-1) : missingReleases(releases, channelState);
}

export function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed:\n${result.stderr || result.stdout}`);
  return result.stdout.trim();
}

export async function recordedChannel(root, channel) {
  const releases = {};
  try {
    const entries = await readdir(join(root, "patches", channel), { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const data = await loadJson(join(root, "patches", channel, entry.name, "manifest.json"), null);
      if (data?.channel === channel && ["applied", "deferred"].includes(data.status) && data.tag) {
        releases[data.tag] = { status: data.status, patchDirectory: `patches/${channel}/${entry.name}`, targetCommitish: data.targetCommitish, publishedAt: data.publishedAt ?? null, patches: data.patches ?? [], reason: data.reason ?? null };
      }
    }
  } catch (error) { if (error.code !== "ENOENT") throw error; }
  return { releases };
}

export async function loadJson(path, fallback) {
  try { return JSON.parse(await readFile(path, "utf8")); } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
}

export async function saveJson(path, value) {
  await mkdir(resolve(path, ".."), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

export async function patchFiles(directory) {
  try { return (await readdir(directory)).filter((name) => name.endsWith(".patch")).sort(); }
  catch (error) { if (error.code === "ENOENT") return []; throw error; }
}

export async function copyPatchSeries(source, destination) {
  await rm(destination, { recursive: true, force: true });
  await mkdir(destination, { recursive: true });
  if (!source) return [];
  for (const file of await patchFiles(source)) await cp(join(source, file), join(destination, file));
  return patchFiles(destination);
}

export function releaseTarget(release) {
  // GitHub Releases may retain a branch name (for example, "main") in
  // target_commitish. The release tag is the immutable artifact boundary.
  return release.tag_name;
}

export function manifest({ channel, release, source, status, reason, patches, requiredCommit }) {
  return {
    schemaVersion: 1, channel, upstream: "pingdotgg/t3code", tag: release.tag_name,
    targetCommitish: releaseTarget(release), publishedAt: release.published_at ?? release.created_at,
    source, requiredCommit: requiredCommit ?? null, status, reason: reason ?? null, patches
  };
}

export async function writeManifest(directory, data) { await saveJson(join(directory, "manifest.json"), data); }

export function ensureClone(root, clonePath) {
  const absolute = resolve(root, clonePath);
  try { run("git", ["rev-parse", "--git-dir"], absolute); }
  catch { run("git", ["clone", "https://github.com/pingdotgg/t3code.git", absolute], root); }
  run("git", ["fetch", "origin", "--tags"], absolute);
  return absolute;
}

export function checkoutRelease(clone, release) {
  const branch = `t3code-pi/${safeReleaseName(release.tag_name)}`;
  run("git", ["checkout", "--detach", "--force", releaseTarget(release)], clone);
  run("git", ["checkout", "-B", branch], clone);
  return run("git", ["rev-parse", "HEAD"], clone);
}

export function hasCommit(clone, commit) {
  try { run("git", ["merge-base", "--is-ancestor", commit, "HEAD"], clone); return true; }
  catch { return false; }
}

export function applyAndExport(clone, patchDirectory, baseCommit) {
  const patches = patchFiles(patchDirectory);
  return patches.then((files) => {
    if (!files.length) return [];
    try { run("git", ["am", ...files.map((file) => join(patchDirectory, file))], clone); }
    catch (error) { try { run("git", ["am", "--abort"], clone); } catch {} throw error; }
    return rm(patchDirectory, { recursive: true, force: true })
      .then(() => mkdir(patchDirectory, { recursive: true }))
      .then(() => run("git", ["format-patch", "--no-numbered", "-o", patchDirectory, `${baseCommit}..HEAD`], clone))
      .then(() => patchFiles(patchDirectory));
  });
}

export function latestSuccessfulSource(channelState, baseline) {
  const completed = Object.values(channelState?.releases ?? {})
    .filter((entry) => entry.status === "applied")
    .sort((a, b) => String(a.publishedAt ?? "").localeCompare(String(b.publishedAt ?? "")));
  return completed.at(-1)?.patchDirectory ?? baseline;
}

export function record(state, channel, tag, entry) {
  state.channels ??= {};
  state.channels[channel] ??= { releases: {} };
  state.channels[channel].releases[tag] = entry;
}

export function relative(root, path) { return path.slice(resolve(root).length + 1); }
export function patchDirectory(root, channel, tag) { return join(root, "patches", channel, safeReleaseName(tag)); }
export function patchDirectoryName(path) { return basename(path); }
