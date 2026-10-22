import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { resolve, sep } from "node:path";

// Run against the packaged root, not the developer's full node_modules.
const runtimeRoot = resolve(process.argv[2] || ".");
const runtimeRequire = createRequire(resolve(runtimeRoot, "package.json"));
const sharpPath = runtimeRequire.resolve("sharp");
assert.ok(sharpPath.startsWith(`${runtimeRoot}${sep}node_modules${sep}`), "Sharp must belong to the packaged runtime");
const sharp = runtimeRequire("sharp");
const { data, info } = await sharp({ create: { width: 192, height: 128, channels: 3, background: "#123456" } })
  .resize({ width: 96 }).webp({ quality: 75 }).toBuffer({ resolveWithObject: true });
assert.equal(info.width, 96);
assert.equal(info.height, 64);
assert.equal(info.format, "webp");
assert.ok(data.length > 0 && data.length < 10_000, "Expected a bounded optimized image");
console.log(JSON.stringify({ imageRuntime: "ok", width: info.width, height: info.height, format: info.format, bytes: data.length }));
