import * as THREE from "three";
import type { AppState } from "../domain";
import type { SpatialReading } from "../spatial.ts";
import { spatialSnapshot } from "../spatial.ts";
import { rackForDevice } from "../installation.ts";
import type { SceneModel } from "./models";
import type { InstallationScene } from "./installation";

type Uniforms = {
  mode: { value: number };
  temperature: { value: number };
  load: { value: number };
  alarm: { value: number };
  range: { value: THREE.Vector2 };
  center: { value: THREE.Vector3 };
  span: { value: number };
  gradient: { value: number };
};
const uniforms = (): Uniforms => ({
  mode: { value: 0 },
  temperature: { value: 27 },
  load: { value: 0 },
  alarm: { value: 0 },
  range: { value: new THREE.Vector2(20, 45) },
  center: { value: new THREE.Vector3() },
  span: { value: 0.9 },
  gradient: { value: 0 },
});
/** 在原网格表面着色，结构纹理保留；数值来自确定性演示模型，不是热流体仿真。 */
export class SurfaceObservation {
  static nextGeneration = 0;
  generation = SurfaceObservation.nextGeneration++;
  bindings: { object: THREE.Object3D; id: () => string; uniforms: Uniforms }[] =
    [];
  materials: THREE.Material[] = [];
  cachedKey = "";
  snapshot = spatialSnapshot(0);
  constructor(
    models: SceneModel,
    installation: InstallationScene,
    getState: () => AppState,
  ) {
    const bind = (root: THREE.Object3D, id: () => string, clone = true) => {
      const cache = new Map<THREE.Material, THREE.Material>();
      const u = uniforms();
      this.bindings.push({ object: root, id, uniforms: u });
      root.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        const apply = (source: THREE.Material) => {
          if (cache.has(source)) return cache.get(source)!;
          if (!(source instanceof THREE.MeshStandardMaterial)) return source;
          const material = clone ? source.clone() : source;
          if (clone) this.materials.push(material);
          material.onBeforeCompile = (shader) => {
            Object.assign(shader.uniforms, {
              mMode: u.mode,
              mTemperature: u.temperature,
              mLoad: u.load,
              mAlarm: u.alarm,
              mRange: u.range,
              mCenter: u.center,
              mSpan: u.span,
              mGradient: u.gradient,
            });
            shader.vertexShader =
              "varying vec3 vMirageWorld;\n" + shader.vertexShader;
            shader.vertexShader = shader.vertexShader.replace(
              "#include <worldpos_vertex>",
              "#include <worldpos_vertex>\nvMirageWorld=(modelMatrix*vec4(transformed,1.0)).xyz;",
            );
            shader.fragmentShader =
              `varying vec3 vMirageWorld;
              uniform float mMode; uniform float mTemperature; uniform float mLoad; uniform float mAlarm; uniform vec2 mRange; uniform vec3 mCenter; uniform float mSpan; uniform float mGradient;
              vec3 thermalColor(float x) {
                vec3 a=vec3(.04,.24,.48),b=vec3(.06,.51,.67),c=vec3(.18,.74,.78),d=vec3(.98,.64,.19),e=vec3(.98,.20,.28);
                if(x<.25)return mix(a,b,x*4.);if(x<.5)return mix(b,c,(x-.25)*4.);if(x<.75)return mix(c,d,(x-.5)*4.);return mix(d,e,clamp((x-.75)*4.,0.,1.));
              }
              vec3 loadColor(float x){return x<.5?mix(vec3(.10,.22,.43),vec3(.13,.67,.83),x*2.):mix(vec3(.13,.67,.83),vec3(.99,.68,.23),(x-.5)*2.);}
              ` + shader.fragmentShader;
            shader.fragmentShader = shader.fragmentShader.replace(
              "#include <map_fragment>",
              `#include <map_fragment>
              if(mMode>.5){
                float detail=mix(.52,1.,clamp(dot(diffuseColor.rgb,vec3(.2126,.7152,.0722))*1.7,0.,1.));
                vec3 tint=vec3(.24,.29,.35);
                if(mMode<1.5){float gradient=clamp((mCenter.z-vMirageWorld.z)/max(.03,mSpan),-0.5,.5)*6.*mGradient;tint=thermalColor(clamp((mTemperature+gradient-mRange.x)/(mRange.y-mRange.x),0.,1.));}
                else if(mMode<2.5)tint=loadColor(clamp(mLoad,0.,1.));
                else if(mMode<3.5)tint=mAlarm>1.5?vec3(.95,.18,.10):mAlarm>.5?vec3(.98,.64,.12):vec3(.24,.31,.39);
                diffuseColor.rgb=mix(diffuseColor.rgb,pow(max(tint,vec3(0.)),vec3(2.2))*detail,mMode>3.5?.18:(mMode>2.5?(mAlarm>.5?.22:0.):(mGradient>.5?.6:.16)));
              }`,
            );
            shader.fragmentShader = shader.fragmentShader.replace(
              "#include <roughnessmap_fragment>",
              "#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,.58,step(.5,mMode)*.5);",
            );
            shader.fragmentShader = shader.fragmentShader.replace(
              "#include <metalnessmap_fragment>",
              "#include <metalnessmap_fragment>\nmetalnessFactor=mix(metalnessFactor,.22,step(.5,mMode)*.5);",
            );
          };
          material.customProgramCacheKey = () =>
            `mirage-surface-observation-v1-${this.generation}`;
          material.needsUpdate = true;
          cache.set(source, material);
          return material;
        };
        object.material = Array.isArray(object.material)
          ? object.material.map(apply)
          : apply(object.material);
      });
    };
    bind(models.rack, () => rackForDevice(getState().deviceId).id, false);
    // 每个网格按最近的已登记模组归属着色，子件不会继承其他模组的状态。
    const roots = [...models.parts.values()];
    for (const root of roots) {
      // 父模组遍历时跳过子模组，由下方的子件绑定覆盖，材质独立。
      bind(root, () =>
        getState().level === "device"
          ? root.userData.entityId
          : getState().deviceId,
      );
    }
    // 机箱及未拆分结构使用设备自身进风温度 / 输入功耗。
    const baseMeshes: THREE.Mesh[] = [];
    models.server.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      let parent = object.parent;
      while (parent && parent !== models.server) {
        if (models.parts.has(parent.userData.entityId)) return;
        parent = parent.parent;
      }
      baseMeshes.push(object);
    });
    for (const mesh of baseMeshes) bind(mesh, () => getState().deviceId);
    for (const [id, group] of installation.racks) bind(group, () => id);
  }
  update(
    state: AppState,
    mode: "object" | "status" | "temperature" | "power" | "alarms",
  ) {
    const key = `${state.time}:${state.replayCycle}:${state.deviceId}`;
    if (key !== this.cachedKey) {
      this.cachedKey = key;
      this.snapshot = spatialSnapshot(
        state.time,
        state.replayCycle,
        state.deviceId,
      );
    }
    const box = new THREE.Box3();
    for (const binding of this.bindings) {
      let ancestor: THREE.Object3D | null = binding.object;
      while (ancestor && ancestor.visible) ancestor = ancestor.parent;
      if (ancestor) continue;

      const reading: SpatialReading | undefined = this.snapshot.readings.get(
        binding.id(),
      );
      const u = binding.uniforms;
      u.mode.value =
        mode === "object" || mode === "status"
          ? 0
          : !reading || reading.quality !== "valid"
            ? 4
            : mode === "temperature"
              ? reading.temperature === null
                ? 4
                : 1
              : mode === "power"
                ? reading.power === null || !reading.budget
                  ? 4
                  : 2
                : 3;
      u.temperature.value = reading?.temperature ?? 27;
      u.load.value =
        reading?.power !== null && reading?.budget
          ? reading.power / reading.budget
          : 0;
      u.alarm.value = reading?.alarm ?? 0;
      u.range.value.set(20, state.level === "device" ? 80 : 45);
      u.gradient.value = state.level === "device" ? 1 : 0;
      if (mode === "temperature" && state.level === "device") {
        box.setFromObject(binding.object);
        box.getCenter(u.center.value);
        u.span.value = Math.max(0.03, box.max.z - box.min.z);
      }
    }
  }
  dispose() {
    for (const material of this.materials) material.dispose();
  }
}
