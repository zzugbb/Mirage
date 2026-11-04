import { useEffect, useState } from "react";
import type { TemperatureSlice } from "../temperature-slice";

export function SlicePeakPreview({
  peak,
  selectedId,
  onPreview,
}: {
  peak: TemperatureSlice["highestInput"];
  selectedId: string;
  onPreview: (id: string) => () => void;
}) {
  const [visit, setVisit] = useState<{
    restore: () => void;
    target: string;
  } | null>(null);
  const returning = visit?.target === selectedId;
  // 手动选了其他对象，就结束这次往返；时钟推进仍停留在用户预览的设备。
  useEffect(() => {
    if (visit && visit.target !== selectedId) setVisit(null);
  }, [visit, selectedId]);
  const name = peak?.id.toUpperCase();
  return (
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
          setVisit({ restore: onPreview(peak.id), target: peak.id });
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
  );
}
