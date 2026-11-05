import { TemperatureDisclosure } from "./TemperatureDisclosure";
import { useEffect, useRef, useState } from "react";
import type { TemperatureSlice } from "../temperature-slice";
import type { SpatialReading } from "../spatial";
import { qualityNames } from "../status";
import { rackForDevice } from "../installation";
import { unitLabel } from "../catalog";

function missingReason(reading?: SpatialReading) {
  if (!reading) return "未配置";
  if (reading.quality === "stale" && reading.observedAt !== null)
    return `已过期 · 最后观测 ${reading.observedAt} 秒`;
  if (reading.quality !== "valid") return qualityNames[reading.quality];
  return reading.lifecycle === "stopped" ? "停机 · 无进风读数" : "无进风读数";
}

export function SliceInputPreview({
  slice,
  readings,
  onTakeover,
  selectedId,
  onPreview,
}: {
  slice: TemperatureSlice;
  readings: Map<string, SpatialReading>;
  onTakeover: () => void;
  selectedId: string;
  onPreview: (id: string) => () => void;
}) {
  const coverage = useRef<HTMLDetailsElement>(null);
  const [visit, setVisit] = useState<{
    restore: () => void;
    target: string;
  } | null>(null);
  const returning = visit?.target === selectedId;
  // 手动选了其他对象，就结束这次往返；时钟推进仍停留在用户预览的设备。
  useEffect(() => {
    if (visit && visit.target !== selectedId) setVisit(null);
  }, [visit, selectedId]);
  const peak = slice.highestInput;
  const name = peak?.id.toUpperCase();
  const preview = (id: string) => {
    const restore = onPreview(id);
    setVisit({ target: id, restore: visit?.restore ?? restore });
    if (coverage.current?.open && matchMedia("(max-width: 600px)").matches) {
      coverage.current.open = false;
      coverage.current.querySelector("summary")?.focus({ preventScroll: true });
    }
  };
  return (
    <>
      <TemperatureDisclosure
        className="slice-coverage"
        detailsRef={coverage}
        onInteract={onTakeover}
        summaryClassName="review-slice-stats"
        summary={
          <>
            <span>
              {slice.orientation === "horizontal" ? "本层" : "本排"}有效{" "}
              {slice.validInputs}/{slice.totalInputs} 台
            </span>
            <span>
              {slice.min === null
                ? "无有效估计"
                : `${slice.min.toFixed(1)}–${slice.max!.toFixed(1)} °C`}
            </span>
          </>
        }
      >
        {slice.unavailableIds.length ? (
          <>
            <p>未参与估计 · {slice.unavailableIds.length} 台</p>
            <ul>
              {slice.unavailableIds.map((id) => (
                <li key={id}>
                  <button
                    type="button"
                    aria-label={`预览未参与估计的设备 ${id.toUpperCase()}`}
                    aria-describedby={`slice-input-${id}`}
                    aria-pressed={selectedId === id}
                    disabled={selectedId === id}
                    onClick={() => preview(id)}
                  >
                    <span>
                      <b>{id.toUpperCase()}</b> ·{" "}
                      {rackForDevice(id).name.split(" ")[0]} / {unitLabel(id)}
                    </span>
                    <span id={`slice-input-${id}`}>
                      {missingReason(readings.get(id))}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p>
            {slice.totalInputs
              ? "范围内的设备均有有效进风读数。"
              : "当前高度附近没有设备输入。"}
          </p>
        )}
        <small>超出设备输入的插值范围也会留白。</small>
      </TemperatureDisclosure>
      <button
        type="button"
        className="slice-peak-preview"
        disabled={!returning && (!peak || peak.id === selectedId)}
        aria-label={
          returning
            ? "返回预览前的对象"
            : peak
              ? `${peak.id === selectedId ? "已选" : "预览"}切片最高输入 ${name}，${peak.temperature.toFixed(1)} 摄氏度`
              : "无有效进风输入"
        }
        onClick={() => {
          if (returning && visit) {
            setVisit(null);
            visit.restore();
          } else if (peak) {
            preview(peak.id);
          }
        }}
      >
        {returning ? (
          <>
            <span>← 返回原选择</span>
            <span>{selectedId.toUpperCase()}</span>
          </>
        ) : (
          <>
            <span>最高输入{peak && ` · ${name}`}</span>
            <span>
              {peak
                ? `${peak.temperature.toFixed(1)} °C${peak.id === selectedId ? " · 已选" : " ↗"}`
                : "暂无有效值"}
            </span>
          </>
        )}
      </button>
    </>
  );
}
