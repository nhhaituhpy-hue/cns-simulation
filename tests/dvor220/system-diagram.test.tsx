import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { Dvor220SystemDiagram } from "@/modules/operations/dvor-220/dvor220-system-diagram";

type Point = [number, number];

function sharedRun([ax, ay]: Point, [bx, by]: Point, [cx, cy]: Point, [dx, dy]: Point) {
  const overlap = (a: number, b: number, c: number, d: number) =>
    Math.min(Math.max(a, b), Math.max(c, d)) - Math.max(Math.min(a, b), Math.min(c, d));

  if (ay === by && ay === cy && cy === dy) return overlap(ax, bx, cx, dx);
  if (ax === bx && ax === cx && cx === dx) return overlap(ay, by, cy, dy);
  return 0;
}

it("renders the IFB and NIU data links on distinct tracks and SCU ports in power/control", () => {
  render(<Dvor220SystemDiagram selectedOccurrenceId={null} onSelect={() => {}} />);
  fireEvent.click(screen.getByRole("tab", { name: "Nguồn & điều khiển" }));
  const diagram = screen.getByRole("img", { name: /^Nguồn & điều khiển,/ });
  const touches = ([px, py]: Point, name: RegExp) => {
    const block = Array.from(diagram.querySelectorAll('[role="button"]')).find((node) =>
      name.test(node.getAttribute("aria-label") ?? ""),
    );
    expect(block).toBeDefined();
    const bounds = block!.querySelector("rect")!;
    const x = Number(bounds.getAttribute("x"));
    const y = Number(bounds.getAttribute("y"));
    const right = x + Number(bounds.getAttribute("width"));
    const bottom = y + Number(bounds.getAttribute("height"));
    return ((px === x || px === right) && py > y && py < bottom) ||
      ((py === y || py === bottom) && px > x && px < right);
  };
  const paths = Array.from(diagram.querySelectorAll("polyline"), (element) => ({
    element,
    points: element.getAttribute("points")!.trim().split(/\s+/).map((pair) => pair.split(",").map(Number) as Point),
  }));
  const arrivals = paths.filter(({ points }) => touches(points.at(-1)!, /^SCU ×2 CAN/));
  const linkFrom = (name: RegExp) => {
    const links = arrivals.filter(({ points }) => touches(points[0], name));
    expect(links).toHaveLength(1);
    const [link] = links;
    expect(link.element).toHaveAttribute("data-kind", "data");
    expect(link.element).toHaveAttribute("marker-start");
    expect(link.element).toHaveAttribute("marker-end");
    return link;
  };
  const ifb = linkFrom(/^IFB,/);
  const niu = linkFrom(/^NIU ×2,/);
  expect(diagram).toHaveTextContent("ETHERNET");

  for (const link of [ifb, niu]) {
    const longestSharedRun = Math.max(0, ...paths.filter((other) => other !== link).flatMap(({ points }) =>
      link.points.slice(1).flatMap((end, i) =>
        points.slice(1).map((otherEnd, j) => sharedRun(link.points[i], end, points[j], otherEnd)),
      ),
    ));
    expect(longestSharedRun, "coincident SVG path length on an IFB/NIU link to the SCU").toBe(0);
    for (const other of arrivals.filter((path) => path !== link)) {
      expect(link.points.at(-1)).not.toEqual(other.points.at(-1));
    }
  }
});
