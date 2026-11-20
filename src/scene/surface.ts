import * as THREE from "three";
import type { AppState } from "../domain";
import type { SpatialReading } from "../spatial.ts";
import { spatialSnapshot } from "../spatial.ts";
import { rackForDevice } from "../installation.ts";
import type { SceneModel } from "./models";
import type { InstallationScene } from "./installation";

import { temperatureStops, powerStops } from "./metric-color.ts";
import { budgetRatio } from "../power-budget.ts";
import { signalStyles } from "../status.ts";

const warning = new THREE.Color(signalStyles.warning.color);
const critical = new THREE.Color(signalStyles.critical.color);

type Uniforms = {
  qualityColor: { value: THREE.Color };
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
  qualityColor: { value: new THREE.Color(signalStyles.missing.color) },
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
  bindings: {
    object: THREE.Object3D;
    id: () => string;
    rack: boolean;
    uniforms: Uniforms;
  }[] = [];
  materials: THREE.Material[] = [];
  cachedKey = "";
  snapshot = spatialSnapshot(0);
  constructor(
    models: SceneModel,
    installation: InstallationScene,
    getState: () => AppState,
  ) {
    const bind = (root: THREE.Object3D, id: () => string, rack = false) => {
      const cache = new Map<THREE.Material, THREE.Material>();
      const u = uniforms();
      this.bindings.push({ object: root, id, rack, uniforms: u });
      root.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        const apply = (source: THREE.Material) => {
          if (cache.has(source)) return cache.get(source)!;
          if (!(source instanceof THREE.MeshStandardMaterial)) return source;
          const material = source.clone();
          this.materials.push(material);
          material.onBeforeCompile = (shader) => {
            Object.assign(shader.uniforms, {
              mMode: u.mode,
              mTemperatureStops: { value: temperatureStops },
              mPowerStops: { value: powerStops },
              mQualityColor: u.qualityColor,
              mWarning: { value: warning },
              mCritical: { value: critical },
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
              uniform vec3 mTemperatureStops[5],mPowerStops[3],mQualityColor,mWarning,mCritical;
              vec3 thermalColor(float x) {
                int i=min(3,int(x*4.));
                return mix(mTemperatureStops[i],mTemperatureStops[i+1],x*4.-float(i));
              }
              vec3 loadColor(float x){
                int i=min(1,int(x*2.));
                return mix(mPowerStops[i],mPowerStops[i+1],x*2.-float(i));
              }
              ` + shader.fragmentShader;
            shader.fragmentShader = shader.fragmentShader.replace(
              "#include <map_fragment>",
              `#include <map_fragment>
              if (mMode > 2.5) {
                vec3 tint = mMode > 3.5 ? mQualityColor : (mAlarm > 1.5 ? mCritical : mWarning);
                float weight = mMode > 3.5 ? .18 : (mAlarm > .5 ? .22 : 0.);
                float detail = mix(.52,1.,clamp(dot(diffuseColor.rgb,vec3(.2126,.7152,.0722))*1.7,0.,1.));
                diffuseColor.rgb = mix(diffuseColor.rgb, tint*detail, weight);
              }`,
            );
            // 金属高光容易洗掉数据色。在色调映射后保留结构明暗，再输出到显示色域。
            shader.fragmentShader = shader.fragmentShader.replace(
              "#include <tonemapping_fragment>",
              `#include <tonemapping_fragment>
              if (mMode > .5 && mMode < 2.5) {
                float gradient = clamp((mCenter.z-vMirageWorld.z)/max(.03,mSpan),-.5,.5)*6.*mGradient;
                float temperature = clamp((mTemperature+gradient-mRange.x)/(mRange.y-mRange.x),0.,1.);
                vec3 metricColor = mMode < 1.5 ? thermalColor(temperature) : loadColor(clamp(mLoad,0.,1.));
                float light = clamp(dot(gl_FragColor.rgb,vec3(.2126,.7152,.0722)),0.,1.);
                float relief = mix(.27,1.,sqrt(light));
                float strength = mMode < 1.5 ? mix(.66,.96,smoothstep(.26,.56,temperature))
                                             : mix(.56,.93,smoothstep(.12,.75,mLoad));
                gl_FragColor.rgb = mix(gl_FragColor.rgb,metricColor*relief,strength);
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
    bind(models.rack, () => rackForDevice(getState().deviceId).id, true);
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
    for (const [id, group] of installation.racks) bind(group, () => id, true);
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
    const activeRack = rackForDevice(state.deviceId).id;
    for (const binding of this.bindings) {
      let ancestor: THREE.Object3D | null = binding.object;
      while (ancestor && ancestor.visible) ancestor = ancestor.parent;
      if (ancestor) continue;

      const id = binding.id();
      const u = binding.uniforms;
      if (
        binding.rack &&
        (state.level === "device" ||
          (state.level === "rack" && id !== activeRack))
      ) {
        u.mode.value = 0;
        continue;
      }
      const reading: SpatialReading | undefined =
        this.snapshot.readings.get(id);
      const ratio = reading ? budgetRatio(reading.power, reading.budget) : null;
      const chassis =
        state.level === "device" &&
        id === state.deviceId &&
        (state.coverOpen || state.explosion > 0);
      u.mode.value =
        chassis || mode === "object" || mode === "status"
          ? 0
          : !reading || reading.quality !== "valid"
            ? 4
            : mode === "temperature"
              ? reading.temperature === null
                ? 4
                : 1
              : mode === "power"
                ? ratio === null
                  ? 4
                  : 2
                : 3;
      u.qualityColor.value.set(
        signalStyles[
          reading && reading.quality !== "valid" ? reading.quality : "missing"
        ].color,
      );
      u.temperature.value = reading?.temperature ?? 27;
      u.load.value = ratio ?? 0;
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
