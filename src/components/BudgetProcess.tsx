import { useMemo, useRef } from "react";
import { budgetProcess, type BudgetReview } from "../budget-process";
import { sourceValue } from "../reading-sources";
export function BudgetProcess({
  sourceId,
  time,
  state,
  onChange,
  onSeek,
}: {
  sourceId: string;
  time: number;
  state: BudgetReview;
  onChange: (state: BudgetReview) => void;
  onSeek: (time: number) => void;
}) {
  const summary = useRef<HTMLElement>(null),
    horizon = state.origin ?? time;
  const events = useMemo(
    () => budgetProcess(sourceId, horizon)!,
    [sourceId, horizon],
  );
  const seek = (at: number) => {
    onChange({ ...state, origin: state.origin ?? time });
    onSeek(at);
  };
  return (
    <details
      className="budget-process"
      open={state.open}
      onToggle={(e) => {
        if (e.currentTarget.open !== state.open)
          onChange({ ...state, open: e.currentTarget.open });
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape" && state.open) {
          e.preventDefault();
          e.stopPropagation();
          onChange({ ...state, open: false });
          summary.current?.focus();
        }
      }}
    >
      <summary ref={summary}>预算口径过程 · {events.length - 1} 次变化</summary>
      <p>
        {state.origin === null
          ? `截至 t+${time}s 已发生记录`
          : `核对基准 t+${state.origin}s · 保留当时记录`}
        。场景与当前汇总跟随 t+{time}s。
      </p>
      {state.origin !== null && (
        <button
          onClick={() => {
            onSeek(state.origin!);
            onChange({ ...state, origin: null });
            summary.current?.focus({ preventScroll: true });
          }}
        >
          返回预算核对前 {state.origin}s
        </button>
      )}
      <ol aria-label="预算口径变化记录">
        {events.map((event) => (
          <li key={event.time}>
            <strong>
              {event.time}s · {event.before ? "计入条件变化" : "初始口径"}
            </strong>
            {event.changed.map((row) => (
              <small key={row.id}>
                {row.name}：{row.before} → {row.after}
              </small>
            ))}
            <div className="budget-process-points">
              {[event.before, event.after]
                .filter((v) => v !== null)
                .map((point) => {
                  const b = point.budget;
                  return (
                    <button
                      key={point.time}
                      onClick={() => seek(point.time)}
                      aria-label={`回看预算口径 ${point.time}s`}
                    >
                      <span>
                        {point.time}s ↗ · 计入 {b.observed.count}/
                        {b.configured.count} 台
                      </span>
                      <span>
                        {sourceValue(b.value, "power")} /{" "}
                        {sourceValue(
                          b.observed.missing ? null : b.observed.watts,
                          "power",
                        )}
                      </span>
                      <b>
                        {b.ratio === null
                          ? "—"
                          : `${(b.ratio * 100).toFixed(1)}%`}
                      </b>
                    </button>
                  );
                })}
            </div>
          </li>
        ))}
      </ol>
      <small>
        只记录输入资格与预算口径变化，普通负载变化不另造事件。分子和分母取同一批有效设备，零功耗仍计入预算；占比变化不等于节能、容量变化或支路分流。回看保留镜头和结构，切换范围、指标、关闭输入核对或重播清除基准。
      </small>
    </details>
  );
}
