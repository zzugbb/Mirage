import { TemperatureDisclosure } from "./TemperatureDisclosure";
import { useEffect, useRef, useState } from "react";
import type { SliceControls, TemperatureSlice } from "../temperature-slice";
import type { SpatialReading } from "../spatial";
import { sliceDeviceContext } from "../slice-device";

export function SliceDeviceContext({
  selectedId,
  controls,
  slice,
  readings,
  inspecting,
  onInspect,
  onChange,
  onInteract,
}: {
  inspecting: boolean;
  onInspect: () => void;
  selectedId: string;
  controls: SliceControls;
  slice: TemperatureSlice;
  readings: Map<string, SpatialReading>;
  onInteract: () => void;
  onChange: (controls: SliceControls) => void;
}) {
  const details = useRef<HTMLDetailsElement>(null);
  const wasInspecting = useRef(inspecting);
  useEffect(() => {
    if (wasInspecting.current && !inspecting)
      details.current?.querySelector("summary")?.focus({ preventScroll: true });
    wasInspecting.current = inspecting;
  }, [inspecting]);
  const context = sliceDeviceContext(selectedId, controls, slice, readings);
  const [visit, setVisit] = useState<{
    before: SliceControls;
    applied: SliceControls;
  } | null>(null);
  const returning =
    visit && JSON.stringify(visit.applied) === JSON.stringify(controls);
  useEffect(() => {
    if (visit && !returning) setVisit(null);
  }, [visit, returning]);
  if (!context) return null;
  return (
    <TemperatureDisclosure
      detailsRef={details}
      className="slice-device-context"
      onInteract={onInteract}
      summary={<>对照所查设备 · {context.name}</>}
    >
      <p>
        {context.location} · 进风代表高度 {context.height.toFixed(2)} m
      </p>
      <dl>
        <div>
          <dt>设备进风</dt>
          <dd>
            {context.temperature === null
              ? context.unavailable
              : `${context.temperature.toFixed(1)} °C`}
          </dd>
        </div>
        <div>
          <dt>当前切面 · 柜前估计</dt>
          <dd>
            {context.estimate === null
              ? "无有效估计"
              : `约 ${context.estimate.toFixed(1)} °C`}
          </dd>
        </div>
      </dl>
      <p>{context.explanation}</p>
      <button
        disabled={!returning && context.aligned}
        onClick={() => {
          if (returning) {
            onChange(visit.before);
            setVisit(null);
          } else {
            setVisit({ before: controls, applied: context.target });
            onChange(context.target);
          }
        }}
      >
        {returning
          ? "返回原切片位置"
          : context.aligned
            ? "已在设备附近"
            : "切片对齐设备附近"}
      </button>
      <button disabled={inspecting} onClick={onInspect}>
        {inspecting ? "正在核对估计依据" : "核对估计依据 ↗"}
      </button>
      <small>按滑杆步长取邻近高度或柜前距离；读数随共享时间变化。</small>
    </TemperatureDisclosure>
  );
}
