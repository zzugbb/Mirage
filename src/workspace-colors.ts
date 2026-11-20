import type { CSSProperties } from "react";
import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import { signalStyles } from "./status.ts";

const ramp = (stops: string[]) =>
  `linear-gradient(to right in srgb-linear, ${stops.join(", ")})`;
const { temperature, power } = definition.rendering.observationColors;
const flow = definition.airflow.colors;

export const workspaceColors = {
  "--temperature-ramp": ramp(temperature),
  "--power-ramp": ramp(power),
  "--flow-supply": flow.supply,
  "--flow-through": flow.through,
  "--flow-return": flow.return,
  "--flow-unknown": flow.unknown,
  "--signal-normal": signalStyles.normal.color,
  "--signal-warning": signalStyles.warning.color,
  "--signal-critical": signalStyles.critical.color,
} satisfies Record<`--${string}`, string> as CSSProperties;
