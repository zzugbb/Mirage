import { spatialSnapshot } from "./spatial.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { SurfaceObservation } from "./scene/surface.ts";
import type { SceneModel } from "./scene/models.ts";
import type { InstallationScene } from "./scene/installation.ts";
import { createState, transition } from "./domain.ts";

test("原材质与实例着色互不串值，增强模型载入后重绑仍能刷新主机柜颜色", () => {
  const material = new THREE.MeshStandardMaterial({
    color: "#2a3038",
    metalness: 0.7,
  });
  const rack = new THREE.Group();
  rack.add(new THREE.Mesh(new THREE.BoxGeometry(0.6, 2.1, 1.1), material));
  const server = new THREE.Group();
  server.add(
    new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.089, 0.9), material.clone()),
  );
  const contextRack = rack.clone(true);
  const models = { rack, server, parts: new Map() } as unknown as SceneModel;
  const installation = {
    racks: new Map([["rack-a03", contextRack]]),
    devices: new Map(),
  } as unknown as InstallationScene;
  let state = transition(createState(), { type: "seek", time: 60 });
  const first = new SurfaceObservation(models, installation, () => state);
  const firstKey = material.customProgramCacheKey();
  const capture = (source: THREE.Material) => {
    const shader = {
      uniforms: {},
      vertexShader: "#include <worldpos_vertex>",
      fragmentShader:
        "#include <map_fragment>\n#include <roughnessmap_fragment>\n#include <metalnessmap_fragment>",
    } as unknown as Parameters<THREE.Material["onBeforeCompile"]>[0];
    source.onBeforeCompile(shader, {} as THREE.WebGLRenderer);
    return shader;
  };
  const rackShader = capture(material);
  const contextShader = capture(
    (contextRack.children[0] as THREE.Mesh).material as THREE.Material,
  );
  first.update(state, "temperature");
  assert.equal(
    rackShader.uniforms.mTemperature.value,
    spatialSnapshot(60).readings.get("rack-a01")!.temperature,
  );
  assert.ok(
    contextShader.uniforms.mTemperature.value <
      rackShader.uniforms.mTemperature.value!,
  );
  assert.equal(rackShader.uniforms.mGradient.value, 0);
  first.update(state, "object");
  assert.equal(rackShader.uniforms.mMode.value, 0);
  assert.equal(material.color.getHexString(), "2a3038");
  assert.equal(material.metalness, 0.7);
  first.dispose();
  const second = new SurfaceObservation(models, installation, () => state);
  assert.notEqual(material.customProgramCacheKey(), firstKey);
  const rebound = capture(material);
  state = transition(state, { type: "seek", time: 0 });
  second.update(state, "temperature");
  assert.equal(
    rebound.uniforms.mTemperature.value,
    spatialSnapshot(0).readings.get("rack-a01")!.temperature,
  );
  const serverShader = capture(
    (server.children[0] as THREE.Mesh).material as THREE.Material,
  );
  state = transition(state, { type: "select", id: "srv-59" });
  state = transition(state, { type: "seek", time: 60 });
  second.update(state, "temperature");
  assert.equal(
    serverShader.uniforms.mMode.value,
    4,
    "过期值不能按当前温度着色",
  );
  second.update(state, "status");
  assert.equal(serverShader.uniforms.mMode.value, 0, "态势模式保留原材质");
  second.dispose();
});
