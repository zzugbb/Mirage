import type { EnvironmentRound } from "../environment-rounds";
import {
  environmentObservation,
  environmentChannelText,
} from "../environment-monitoring";
import { trayRungBottom } from "../cable-trays";

export function EnvironmentRoundDetails({
  round,
  selected,
  time,
  open,
  ready,
  hidden,
  onToggle,
  onLocate,
  onCompare,
}: {
  round: EnvironmentRound;
  selected: string;
  time: number;
  open: boolean;
  ready: boolean;
  hidden: boolean;
  onToggle: () => void;
  onLocate: (id: string) => void;
  onCompare: () => void;
}) {
  const [smoke, tray, probe] = round.points;
  const observation = environmentObservation(probe.id, time)!;
  return (
    <section
      hidden={hidden}
      className="environment-round"
      aria-label={round.row.name + "环境巡检"}
    >
      <button
        className="environment-round-toggle"
        aria-expanded={open}
        onClick={onToggle}
      >
        {round.row.name}环境巡检 <span>{open ? "收起 −" : "核对布置 +"}</span>
      </button>
      {open && (
        <>
          <p>
            {round.racks.map((rack) => rack.name.split(" ")[0]).join(" · ")}
          </p>
          <ol>
            {round.points.map((point) => (
              <li key={point.id}>
                <button
                  aria-label={`定位${point.name}`}
                  aria-current={selected === point.id ? "location" : undefined}
                  disabled={!ready}
                  onClick={() => onLocate(point.id)}
                >
                  <strong>{point.name}</strong>
                  <span>
                    {selected === point.id ? "已选 · 定位" : "定位 ↗"}
                  </span>
                  <small>
                    {point.location} ·{" "}
                    {point.id === tray.id
                      ? `横档底高 ${trayRungBottom(point.position[1]).toFixed(2)} m`
                      : `中心高 ${point.position[1].toFixed(2)} m`}
                  </small>
                  <small>
                    {point.id === smoke.id
                      ? "烟感信号未接入"
                      : point.id === tray.id
                        ? `烟感中心距桥架中心线 ${round.smokeOffset.toFixed(2)} m（水平）`
                        : `模拟 · 温度 ${environmentChannelText(observation.temperature, "°C")} · 湿度 ${environmentChannelText(observation.humidity, "%RH")}`}
                  </small>
                </button>
              </li>
            ))}
          </ol>
          {(selected === smoke.id || selected === tray.id) && (
            <button
              className="environment-round-compare"
              disabled={!ready}
              onClick={onCompare}
            >
              同框核对烟感与桥架 ↗
            </button>
          )}
          <p>
            柜排用于核对安装位置。温湿度只代表墙面探头所在点，烟感探测范围未配置。
          </p>
        </>
      )}
    </section>
  );
}
