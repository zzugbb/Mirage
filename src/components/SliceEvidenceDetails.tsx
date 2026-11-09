import { useEffect, useRef } from "react";
import type { SliceCheck, SliceDeviceInspection } from "../slice-device";
import type { SpatialReading } from "../spatial";
import { deviceById, rackForDevice } from "../installation";
import { unitLabel } from "../catalog";
import { qualityNames } from "../status";

export function SliceEvidenceDetails({
  observing,
  ready,
  onObserve,
  onRestoreView,
  context,
  check,
  readings,
  time,
  onMark,
  onPreview,
  onReturn,
  onClose,
}: {
  observing: boolean;
  ready: boolean;
  onObserve: () => void;
  onRestoreView: () => void;
  context: SliceDeviceInspection;
  check: SliceCheck;
  readings: Map<string, SpatialReading>;
  time: number;
  onMark: (id: string) => void;
  onPreview: (id: string) => void;
  onReturn: () => void;
  onClose: () => void;
}) {
  const evidence = context.evidence;
  const section = useRef<HTMLElement>(null);
  useEffect(() => {
    section.current?.focus();
  }, []);
  return (
    <section
      ref={section}
      className="slice-evidence-details"
      aria-label="切片估计依据"
      tabIndex={-1}
    >
      <header>
        <strong>切片估计依据 · {context.name}</strong>
        <button aria-label="结束切片估计核对" onClick={onClose}>
          ×
        </button>
      </header>
      <p>
        {context.location} · 场景 t+{time}s
      </p>
      <div className="slice-evidence-value">
        <span>柜前位置估计</span>
        <strong>
          {context.estimate === null
            ? "无有效估计"
            : `约 ${context.estimate.toFixed(1)} °C`}
        </strong>
      </div>
      {context.point && (
        <p>
          机房坐标 x {context.point[0].toFixed(2)} / y{" "}
          {context.point[1].toFixed(2)} / z {context.point[2].toFixed(2)} m
        </p>
      )}
      <div className="slice-evidence-view">
        <button
          disabled={!ready || !context.point}
          aria-pressed={observing}
          onClick={onObserve}
        >
          观察估计位置
        </button>
        {observing && (
          <button disabled={!ready} onClick={onRestoreView}>
            返回核对前视角
          </button>
        )}
      </div>
      <p>
        {!evidence
          ? context.explanation
          : evidence.reason === "outside"
            ? "此位置超出所有输入的局部插值范围，保留空白。"
            : evidence.reason === "nearest-unavailable"
              ? "最近的代表输入无效，此位置留白；其他有效邻居也不用于补值。"
              : evidence.reason === "exact"
                ? "此位置与一个进风代表位置重合，直接采用该输入。"
                : "此位置按距离加权附近有效输入；占比仅解释插值计算。"}
      </p>
      <div className="slice-evidence-key">
        <span>□ 估计位置</span>
        <span>○ 有效输入</span>
        <span>× 无当前值</span>
      </div>
      <small>
        标记位于配置代表位置；虚线只对照位置，不表示气流、布线、测点或影响路径。核对期间暂收气流。
      </small>
      {evidence && evidence.inputs.length > 0 && (
        <ol aria-label="当前位置的插值输入">
          {evidence.inputs.map((input) => {
            const reading = readings.get(input.id);
            const reason =
              input.temperature !== null
                ? input.share === null
                  ? "未使用 · 当前位置留白"
                  : input.share === 0
                    ? "未使用 · 采用重合输入"
                    : `计算占比 ${input.share < 0.001 ? "<0.1" : (input.share * 100).toFixed(1)}%`
                : reading?.quality === "valid"
                  ? "停机或无进风读数"
                  : qualityNames[reading?.quality ?? "missing"];
            return (
              <li key={input.id}>
                <button
                  className="slice-evidence-input"
                  aria-label={`标记插值输入 ${input.id.toUpperCase()}`}
                  aria-pressed={check.sourceId === input.id}
                  onClick={() => onMark(input.id)}
                >
                  <span>
                    <b>{deviceById(input.id)?.name}</b>{" "}
                    {input.id === evidence.nearestId && <em>最近</em>}
                    <small>
                      {rackForDevice(input.id).name} / {unitLabel(input.id)}
                    </small>
                  </span>
                  <span>
                    {input.temperature === null
                      ? "—"
                      : `${input.temperature.toFixed(1)} °C`}
                    <small>{reason}</small>
                  </span>
                </button>
                {check.sourceId === input.id && (
                  <div className="slice-evidence-input-actions">
                    {reading?.quality === "stale" && (
                      <small>
                        最后观测 t+{reading.observedAt}s；未用于当前估计。
                      </small>
                    )}
                    <button
                      disabled={
                        check.previewId === input.id ||
                        check.deviceId === input.id
                      }
                      onClick={() => onPreview(input.id)}
                    >
                      {check.deviceId === input.id
                        ? "即所查设备"
                        : check.previewId === input.id
                          ? "正在预览输入"
                          : "预览输入详情"}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
      <p>
        只核对当前柜前位置，不代表整张切片的输入分布或实测环境温度；占比不表示热贡献、风量或置信度。
      </p>
      <button onClick={onReturn}>← 返回原设备对照</button>
    </section>
  );
}
