import * as THREE from "three";
import type { FixtureCrossing } from "../fixture-crossing.ts";
import { createAnnotationGroup } from "./annotations.ts";

function dashSegment(
  points: THREE.Vector3[],
  a: THREE.Vector3,
  b: THREE.Vector3,
  pitch: number,
) {
  const segments = Math.ceil(a.distanceTo(b) / pitch);
  for (let i = 0; i < segments; i++)
    points.push(
      a.clone().lerp(b, (i + 0.18) / segments),
      a.clone().lerp(b, (i + 0.82) / segments),
    );
}

export class CrossingGeometry {
  root = createAnnotationGroup("fixture-crossing");
  material = new THREE.LineBasicMaterial({
    color: "#b9d5cb",
    toneMapped: false,
    transparent: true,
    depthWrite: false,
  });
  geometry = new THREE.BufferGeometry();
  lines = new THREE.LineSegments(this.geometry, this.material);
  constructor() {
    this.root.add(this.lines);
    this.root.visible = false;
    this.lines.raycast = () => {};
  }
  update(pair: FixtureCrossing | null) {
    this.root.visible = !!pair;
    if (!pair) return;
    const [top, bottom] = pair.points;
    const points: THREE.Vector3[] = [];
    if (pair.kind === "grille-seat") {
      pair.outline.forEach((p, i) => points.push(p, pair.outline[(i + 1) % 4]));
    } else if (pair.kind === "grille-intake") {
      for (const outline of [pair.seat.outline, pair.faceOutline])
        outline.forEach((p, i) =>
          points.push(p, outline[(i + 1) % outline.length]),
        );
      const [grille, projected] = pair.plan;
      const [low, high] = pair.heightRuler;
      dashSegment(points, grille, projected, 0.085);
      points.push(projected, low, low, high, high, pair.intake);
      for (const end of [low, high])
        points.push(
          end.clone().setX(end.x - 0.025),
          end.clone().setX(end.x + 0.025),
        );
    } else if (pair.kind === "raceway-corner") {
      if (pair.opened)
        pair.opening.forEach((p, i, opening) =>
          points.push(p, opening[(i + 1) % opening.length]),
        );
    } else if (pair.kind === "probe-height") {
      const [probe, corner, projected, front] = pair.ruler;
      dashSegment(points, probe, corner, 0.19);
      dashSegment(points, corner, projected, 0.27);
      points.push(projected, front);
      for (const end of [probe, corner, projected])
        points.push(
          end.clone().setY(end.y - 0.024),
          end.clone().setY(end.y + 0.024),
        );
      pair.unitOutline.forEach((p, i, outline) =>
        points.push(p, outline[(i + 1) % outline.length]),
      );
    } else if (pair.kind === "drain-joint") {
      for (const path of pair.paths)
        for (let i = 1; i < path.length; i++) points.push(path[i - 1], path[i]);
    } else if (pair.kind === "rear-wall") {
      for (const outline of pair.outlines)
        outline.forEach((p, i) => points.push(p, outline[(i + 1) % 4]));
      const [a, b] = pair.projected;
      const tick = new THREE.Vector3(b.y - a.y, a.x - b.x, 0)
        .normalize()
        .multiplyScalar(0.022);
      for (const [i, end] of pair.projected.entries())
        points.push(
          pair.ends[i],
          end,
          end.clone().sub(tick),
          end.clone().add(tick),
        );
      // 虚线是同一立面上的投影量距。短引线指回构件表面。
      dashSegment(points, a, b, 0.075);
    } else if (pair.kind === "light-rod") {
      const offset = new THREE.Vector3(0, 0.14, pair.toward * 0.035);
      const a = top.clone().add(offset);
      const b = bottom.clone().add(offset);
      points.push(top, a, a, b, b, bottom);
    } else if (pair.kind === "light-hanger") {
      const [above, below] = pair.dropRuler;
      points.push(top, above, above, below, below, bottom);
      const [from, to] = pair.insetRuler;
      points.push(from, to);
      for (const end of [from, to])
        points.push(
          end.clone().setY(end.y - 0.018),
          end.clone().setY(end.y + 0.018),
        );
      for (const [i, a] of pair.topReference.entries())
        dashSegment(
          points,
          a,
          pair.topReference[(i + 1) % pair.topReference.length],
          0.058,
        );
    } else if (pair.kind === "tray-bay") {
      const offset = new THREE.Vector3(0, -0.1, pair.toward * 0.1);
      const a = top.clone().add(offset);
      const b = bottom.clone().add(offset);
      points.push(top, a, a, b, b, bottom);
    } else if (pair.kind === "tray-support") {
      const z = Math.max(top.z, bottom.z) + 0.07;
      const a = new THREE.Vector3(top.x, bottom.y, z);
      const b = new THREE.Vector3(bottom.x, bottom.y, z);
      points.push(top, a, a, b, b, bottom);
    } else if (pair.kind === "roof-entry") {
      // 尺线移到板面稍上方以避开孔边压条；量取的 X/Z 坐标仍来自配置。
      const edge = bottom.clone();
      edge.y += 0.009;
      const foot = top.clone().setY(edge.y);
      points.push(top, foot, foot, edge);
      const outline = pair.outline.map((p) => p.clone().setY(edge.y));
      outline.forEach((p, i) =>
        points.push(p, outline[(i + 1) % outline.length]),
      );
    } else if (pair.kind === "roof-pdu") {
      const outline = pair.entry.outline.map((p) =>
        p.clone().setY(p.y + 0.009),
      );
      outline.forEach((p, i) =>
        points.push(p, outline[(i + 1) % outline.length]),
      );
      for (const {
        axis,
        ends: [a, b],
      } of pair.dimensions) {
        const tick = new THREE.Vector3();
        tick[axis === "x" ? "z" : "x"] = 0.013;
        for (const end of [a, b])
          points.push(end.clone().sub(tick), end.clone().add(tick));
        dashSegment(points, a, b, 0.055);
      }
      // 短括线只圈出配置输入参考点，与外侧标尺保持间隔。
      for (const side of [-1, 1]) {
        const mark = pair.inlet
          .clone()
          .add(new THREE.Vector3(side * 0.022, 0, 0));
        points.push(
          mark.clone().add(new THREE.Vector3(0, -0.018, 0)),
          mark.clone().add(new THREE.Vector3(0, 0.018, 0)),
        );
      }
    } else if (pair.kind === "smoke-mount") {
      const [start] = pair.ruler[0];
      const [end] = pair.ruler.at(-1)!;
      dashSegment(points, start, end, 0.065);
      for (const [a, b] of pair.ruler) points.push(a, b);
      pair.ceiling.forEach((point, index, ceiling) => {
        dashSegment(
          points,
          point,
          ceiling[(index + 1) % ceiling.length],
          0.056,
        );
      });
    } else if (
      pair.kind === "smoke-tray" ||
      (pair.kind === "smoke-light" && pair.view === "housing")
    ) {
      const foot = top.clone().setY(bottom.y);
      points.push(top, foot, foot, bottom);
    } else {
      const brackets =
        pair.kind === "lighting-round"
          ? [pair.points, pair.source.points]
          : [pair.points];
      for (const [upper, lower] of brackets) {
        const offset = new THREE.Vector3(-0.22, 0, 0);
        const a = upper.clone().add(offset);
        const b = lower.clone().add(offset);
        points.push(upper, a, a, b, b, lower);
      }
    }
    // 每种观察的线段数量不同，释放旧顶点缓冲后按当前标记重建。
    this.geometry.dispose();
    this.geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        points.flatMap((p) => p.toArray()),
        3,
      ),
    );
    this.geometry.setDrawRange(0, points.length);
    this.geometry.computeBoundingSphere();
  }
  dispose() {
    this.geometry.dispose();
    this.material.dispose();
    this.root.removeFromParent();
  }
}
