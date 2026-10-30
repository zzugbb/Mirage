import { useEffect, useId, useRef, useState } from "react";
import { scenario, temperatureHistory } from "../simulation";

export function TrendChart({
  time,
  metric,
}: {
  time: number;
  metric: "temperature" | "power";
}) {
  const host = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(280);
  const id = useId();
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.max(160, entry.contentRect.width)),
    );
    observer.observe(host.current!);
    return () => observer.disconnect();
  }, []);
  const height = width < 240 ? 145 : width > 320 ? 165 : 150;
  const left = 31,
    right = width - 13,
    top = 15,
    bottom = height - 24;
  const temperature = metric === "temperature";
  const domain = temperature ? [26, 41] : [244, 264];
  const ticks = temperature ? [27, 33, 38] : [248, 254, 260];
  const x = (t: number) => left + (t / scenario.duration) * (right - left);
  const y = (value: number) =>
    bottom - ((value - domain[0]) / (domain[1] - domain[0])) * (bottom - top);
  const history = temperatureHistory(time);
  const current = history.at(-1)!;
  const unit = temperature ? "°C" : "W";
  const name = temperature ? "设备进风温度" : "整机输入功耗";
  const path = history
    .map(
      (sample, index) =>
        `${index ? "L" : "M"}${x(sample.observedAt).toFixed(2)},${y(sample[metric]).toFixed(2)}`,
    )
    .join(" ");
  return (
    <div ref={host} className={`trend-chart ${metric}`}>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-labelledby={id}
      >
        <title
          id={id}
        >{`模拟${name}，0 至 ${current.observedAt} 秒，当前 ${current[metric]} ${unit}；曲线不显示未来结果。`}</title>
        {ticks.map((tick) => (
          <g
            key={tick}
            className={
              temperature && tick >= 33
                ? `threshold threshold-${tick}`
                : "chart-grid"
            }
          >
            <line
              x1={left}
              x2={right}
              y1={y(tick)}
              y2={y(tick)}
              vectorEffect="non-scaling-stroke"
            />
            <text x={left - 7} y={y(tick) + 3} textAnchor="end">
              {tick}
            </text>
          </g>
        ))}
        <text x={left} y={10} className="chart-unit">
          {unit}
        </text>
        {[0, 60, 120].map((tick) => (
          <text key={tick} x={x(tick)} y={height - 6} textAnchor="middle">
            {tick}s
          </text>
        ))}
        <line
          className="chart-cursor"
          x1={x(current.observedAt)}
          x2={x(current.observedAt)}
          y1={top}
          y2={bottom}
        />
        <path
          className="chart-series"
          d={path}
          fill="none"
          vectorEffect="non-scaling-stroke"
        />
        <circle
          className="chart-current"
          cx={x(current.observedAt)}
          cy={y(current[metric])}
          r={3}
        />
      </svg>
      <p className="chart-caption">
        {temperature
          ? "虚线：33 °C 预警 / 38 °C 严重"
          : "整机输入功耗；纵轴 244–264 W"}{" "}
        · 模拟
      </p>
    </div>
  );
}
