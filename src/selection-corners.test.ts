import assert from "node:assert/strict";
import { test } from "node:test";
import * as THREE from "three";
import { SelectionCorners } from "./scene/selection.ts";

test("机柜角标只包住可见柜体，并随前门转动调整边界", () => {
  const rack = new THREE.Group();
  rack.position.set(2, 0.25, 3);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 2, 1));
  body.position.y = 1;
  rack.add(body);

  const rackName = new THREE.Sprite();
  rackName.position.y = 2.5;
  rack.add(rackName);
  const hidden = new THREE.Group();
  hidden.visible = false;
  hidden.position.y = 6;
  hidden.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1)));
  rack.add(hidden);

  const hinge = new THREE.Group();
  hinge.position.set(-0.3, 1, 0.5);
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.9, 0.03));
  door.position.x = 0.3;
  hinge.add(door);
  rack.add(hinge);

  const selection = new SelectionCorners();
  selection.setRackBox(rack);
  assert.equal(selection.box.max.y, 2.25);
  assert.ok(selection.box.max.z < 3.52);

  hinge.rotation.y = -Math.PI / 2;
  selection.setRackBox(rack);
  assert.equal(selection.box.max.y, 2.25);
  assert.ok(selection.box.max.z > 4.09);
});
