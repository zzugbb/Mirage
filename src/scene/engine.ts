import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { buildModels, disposeModels } from './models';
import type { AppState, Level } from '../domain';

export type View = 'iso' | 'top' | 'front' | 'right';
export class SceneEngine {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(40, 1, 0.01, 150);
  controls: OrbitControls;
  models = buildModels();
  state: AppState;
  observer: ResizeObserver;
  frame = 0;
  destroyed = false;
  targetPosition = new THREE.Vector3();
  targetLook = new THREE.Vector3();
  moving = true;
  pointerStart = new THREE.Vector2();
  raycaster = new THREE.Raycaster();
  reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  onSelect: (id: string, enter?: boolean) => void;
  onError: (message: string) => void;
  host: HTMLElement;
  lastTime = 0;

  constructor(host: HTMLElement, state: AppState, onSelect: (id: string, enter?: boolean) => void, onError: (message: string) => void) {
    this.host = host; this.state = state; this.onSelect = onSelect; this.onError = onError;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    this.renderer.setClearColor('#101b23');
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.25;
    this.renderer.domElement.setAttribute('aria-label', '机房三维场景，可拖动旋转、滚轮缩放、点击选择、双击进入');
    this.renderer.domElement.setAttribute('role', 'img');
    this.renderer.domElement.addEventListener('webglcontextlost', this.contextLost);
    host.append(this.renderer.domElement);
    this.scene.fog = new THREE.FogExp2('#101b23', 0.012);
    this.scene.add(new THREE.HemisphereLight('#ceeafa', '#142c38', 2.2));
    const key = new THREE.DirectionalLight('#e9f5fc', 4); key.position.set(0, 9, 4); key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048); key.shadow.camera.left = -7; key.shadow.camera.right = 7; key.shadow.camera.top = 7; key.shadow.camera.bottom = -7; key.shadow.normalBias = 0.025;
    this.scene.add(key);
    const fill = new THREE.DirectionalLight('#58b5c8', 2); fill.position.set(-4, 4, -2); this.scene.add(fill);
    const rim = new THREE.DirectionalLight('#8becd9', 1.1); rim.position.set(4, 2, 3); this.scene.add(rim);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: '#101d26', roughness: 0.95 }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.3; ground.receiveShadow = true; this.scene.add(ground);
    const grid = new THREE.GridHelper(40, 80, '#2b4f5b', '#1d343f'); grid.position.y = -0.285;
    (grid.material as THREE.Material).transparent = true; (grid.material as THREE.Material).opacity = 0.4; this.scene.add(grid);
    for (const group of [this.models.room, this.models.rack, this.models.server, ...this.models.facilities.values()]) this.batch(group);
    this.scene.add(this.models.root);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true; this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.03; this.controls.minDistance = 0.35; this.controls.maxDistance = 24;
    this.controls.addEventListener('start', this.cancelFlight);
    this.camera.position.set(13, 11, 16); this.controls.target.set(0, 0.8, 0);
    this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(host); this.resize();
    this.renderer.domElement.addEventListener('pointerdown', this.pointerDown);
    this.renderer.domElement.addEventListener('pointerup', this.pointerUp);
    this.renderer.domElement.addEventListener('dblclick', this.doubleClick);
    this.renderer.domElement.addEventListener('pointermove', this.hover);
    this.update(state); this.animate(0);
  }

  batch(group: THREE.Group) {
    const batches = new Map<THREE.Material, THREE.Mesh[]>();
    for (const child of group.children) if (child instanceof THREE.Mesh && !Array.isArray(child.material)) {
      const list = batches.get(child.material) ?? []; list.push(child); batches.set(child.material, list);
    }
    for (const [mat, meshes] of batches) {
      if (meshes.length < 2) continue;
      const transformed = meshes.map(mesh => { mesh.updateMatrix(); return mesh.geometry.clone().applyMatrix4(mesh.matrix); });
      const geometry = mergeGeometries(transformed); transformed.forEach(g => g.dispose());
      if (!geometry) continue;
      const merged = new THREE.Mesh(geometry, mat); merged.castShadow = true; merged.receiveShadow = true;
      for (const mesh of meshes) { group.remove(mesh); mesh.geometry.dispose(); } group.add(merged);
    }
  }
  resize() {
    const { width, height } = this.host.getBoundingClientRect(); if (!width || !height) return;
    this.camera.aspect = width / height; this.camera.updateProjectionMatrix(); this.renderer.setSize(width, height);
  }
  contextLost = (event: Event) => { event.preventDefault(); this.onError('三维图形上下文已丢失，请重新加载场景。'); };
  cancelFlight = () => { this.moving = false; };
  objectFor(id: string) {
    return id === 'room-01' ? this.models.room : id === 'rack-a01' ? this.models.rack : id === 'srv-01' ? this.models.server : this.models.facilities.get(id);
  }
  update(state: AppState) {
    const levelChanged = state.level !== this.state.level;
    const focusChanged = state.focusRevision !== this.state.focusRevision;
    const changed = levelChanged || focusChanged;
    this.state = state;
    this.models.room.visible = state.level === 'room'; this.models.rack.visible = state.level !== 'device';
    this.models.server.position.y = state.level === 'device' ? 0.65 : 1.18;
    if (changed || this.lastTime === 0) this.view('iso', focusChanged && !levelChanged);
    this.models.root.updateMatrixWorld(true);
    const object = this.objectFor(state.selected);
    this.models.selection.visible = !!object && state.selected !== 'room-01' && this.visible(object);
    if (object && this.models.selection.visible) { this.models.selection.box.setFromObject(object); this.models.selection.box.expandByScalar(state.level === 'device' ? 0.008 : 0.035); }
  }
  visible(object: THREE.Object3D): boolean { return object.visible && (!object.parent || this.visible(object.parent)); }
  view(view: View, focus = false) {
    const level: Level = this.state.level;
    const object = this.objectFor(this.state.selected);
    const bounds = object && focus ? new THREE.Box3().setFromObject(object) : null;
    const center = bounds ? bounds.getCenter(new THREE.Vector3()) : new THREE.Vector3(0, level === 'room' ? 0.5 : level === 'rack' ? 1.1 : 0.65, 0);
    const size = bounds ? Math.max(...bounds.getSize(new THREE.Vector3()).toArray()) : level === 'room' ? 8.6 : level === 'rack' ? 2.4 : 0.95;
    const distance = size * (this.camera.aspect < 1 ? 2.15 : 1.55);
    const direction = new THREE.Vector3(...(view === 'top' ? [0.001, 1, 0.001] : view === 'front' ? [0, 0.13, 1] : view === 'right' ? [1, 0.2, 0.001] : level === 'rack' ? [0.45, 0.42, 1.5] : [0.85, 0.85, 1.05]) as [number, number, number]).normalize();
    this.targetLook.copy(center); this.targetPosition.copy(center).addScaledVector(direction, distance);
    this.controls.minDistance = level === 'device' ? 0.35 : level === 'rack' ? 1 : 3;
    this.controls.maxDistance = level === 'device' ? 5 : level === 'rack' ? 9 : 24;
    this.moving = true;
  }
  zoom(factor: number) {
    this.moving = false;
    const offset = this.camera.position.clone().sub(this.controls.target);
    offset.setLength(THREE.MathUtils.clamp(offset.length() * factor, this.controls.minDistance, this.controls.maxDistance));
    this.camera.position.copy(this.controls.target).add(offset); this.controls.update();
  }
  pick(event: MouseEvent | PointerEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.raycaster.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1), this.camera);
    for (const hit of this.raycaster.intersectObject(this.models.root, true)) {
      if (!(hit.object instanceof THREE.Mesh) || !this.visible(hit.object)) continue;
      let object: THREE.Object3D | null = hit.object;
      while (object) { if (object.userData.entityId) return object.userData.entityId as string; object = object.parent; }
    }
    return null;
  }
  pointerDown = (event: PointerEvent) => { this.pointerStart.set(event.clientX, event.clientY); };
  pointerUp = (event: PointerEvent) => { if (this.pointerStart.distanceTo(new THREE.Vector2(event.clientX, event.clientY)) < 5) { const id = this.pick(event); if (id) this.onSelect(id); } };
  doubleClick = (event: MouseEvent) => { const id = this.pick(event); if (id) this.onSelect(id, true); };
  hover = (event: PointerEvent) => { this.renderer.domElement.style.cursor = this.pick(event) ? 'pointer' : 'grab'; };
  animate = (time: number) => {
    if (this.destroyed) return;
    const delta = Math.min((time - this.lastTime) / 1000 || 0.016, 0.05); this.lastTime = time;
    if (this.moving) {
      const alpha = this.reducedMotion ? 1 : 1 - Math.exp(-delta * 4.5);
      this.camera.position.lerp(this.targetPosition, alpha); this.controls.target.lerp(this.targetLook, alpha);
      if (this.camera.position.distanceTo(this.targetPosition) < 0.001) this.moving = false;
    }
    if (!this.reducedMotion && this.models.room.visible) for (const fan of this.models.fans) fan.rotation.y += delta * 1.5;
    this.controls.update(); this.renderer.render(this.scene, this.camera);
    this.frame = requestAnimationFrame(this.animate);
  };
  dispose() {
    this.destroyed = true; cancelAnimationFrame(this.frame); this.observer.disconnect(); this.controls.dispose();
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('pointerdown', this.pointerDown); canvas.removeEventListener('pointerup', this.pointerUp);
    canvas.removeEventListener('dblclick', this.doubleClick); canvas.removeEventListener('pointermove', this.hover); canvas.removeEventListener('webglcontextlost', this.contextLost);
    disposeModels(this.scene); this.renderer.dispose(); canvas.remove();
  }
}
