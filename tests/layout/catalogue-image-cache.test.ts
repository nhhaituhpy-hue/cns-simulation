// @vitest-environment node
import { expect, it } from "vitest";
import { getImageProps } from "next/image";
import { SIMULATOR_MODULES } from "@/modules/core/registry";
import { getSimulatorCatalogueImage } from "@/modules/core/simulator-catalogue-images";
import { getSimulatorIconImage } from "@/modules/core/simulator-icon-images";

it.each(SIMULATOR_MODULES.map(device => device.id))("versions %s image requests without changing the device image or dropping metadata", id => {
  const image = getSimulatorCatalogueImage(id);
  const source = typeof image === "string" ? image : image.src;
  expect(new URL(source, "https://fixture.invalid").searchParams.get("imageRuntime")).toBe("1");
  expect(getSimulatorIconImage(id)).toEqual(image);
  const { props } = getImageProps({ src: image, alt: "", width: 80, height: 80, sizes: "80px" });
  const entries = String(props.srcSet).split(", ");
  expect(entries.length).toBeGreaterThan(0);
  for (const entry of entries) {
    const optimizer = new URL(entry.split(" ")[0], "https://fixture.invalid");
    expect(optimizer.pathname).toBe("/_next/image");
    expect(optimizer.searchParams.get("url")).toBe(source);
  }
});
