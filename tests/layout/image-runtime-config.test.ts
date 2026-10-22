// @vitest-environment node
import { beforeAll, expect, it } from "vitest";
import { IncomingMessage } from "node:http";
import { Socket } from "node:net";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
import loadConfig from "next/dist/server/config";
import { ImageOptimizerCache } from "next/dist/server/image-optimizer";
import type { NextConfigComplete } from "next/dist/server/config-shared";
let config: NextConfigComplete;
beforeAll(async () => { config = await loadConfig(PHASE_PRODUCTION_BUILD, process.cwd(), { silent: true }); });
function validate(url: string) {
  const request = new IncomingMessage(new Socket()); request.headers.accept = "image/webp";
  return ImageOptimizerCache.validateParams(request, { url, w: "96", q: "75" }, config, false);
}
it.each([
  "/_next/static/media/DVOR1150.hash.png?imageRuntime=1",
  "/_next/static/media/ads-b-catalogue.hash.png?imageRuntime=1",
  "/images/simulator-icons/vhf.png?imageRuntime=1",
  "/images/simulator-icons/vsat.png?imageRuntime=1",
])("accepts only the explicit image cache revision on %s", url => {
  expect(validate(url)).toMatchObject({ href: url, width: 96, mimeType: "image/webp" });
});
it.each([
  "/_next/static/media/DVOR1150.hash.png?token=secret",
  "/images/simulator-icons/vhf.png?imageRuntime=2",
  "/api/scenario-parameters?imageRuntime=1",
  "https://evil.invalid/image.png?imageRuntime=1",
  "/_next/image?imageRuntime=1",
])("preserves rejection of unapproved query/path %s", url => {
  expect(validate(url)).toHaveProperty("errorMessage");
});
it("preserves existing no-query local images", () => {
  expect(validate("/images/cns-image.webp")).toMatchObject({ href: "/images/cns-image.webp", width: 96 });
});
