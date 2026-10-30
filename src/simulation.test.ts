import { test } from "node:test";
import assert from "node:assert/strict";
import { simulate, scenario, temperatureHistory } from "./simulation.ts";
import { createState, presentationKey, transition } from "./domain.ts";
import { createExperience, experienceTransition } from "./tour.ts";
import { componentCoverage } from "./equipment.ts";
import { parts, subparts } from "./domain.ts";

test("部件覆盖清单准确对应现有模组与独立子件，逻辑及未知条目不伪造模型映射", () => {
  const mapped = componentCoverage.flatMap((item) => [...item.partIds]);
  assert.deepEqual(
    mapped.toSorted(),
    [...parts, ...subparts].map((part) => part.id).toSorted(),
  );
  assert.equal(new Set(mapped).size, 37);
  assert.equal(
    componentCoverage.find((item) => item.name === "处理器芯片")?.partIds
      .length,
    0,
  );
  assert.equal(
    componentCoverage.find((item) => item.name === "网卡 / RAID / GPU")
      ?.quantity,
    "配置未定义",
  );
});

test("固定冷却输入先变化，温度滞后响应，恢复输入不立即清除告警", () => {
  assert.equal(simulate(19).temperature, 27);
  assert.equal(simulate(20).coolingCapacity, 100);
  assert.ok(simulate(23).coolingCapacity < 100);
  assert.ok(simulate(26).temperature < simulate(50).temperature);
  assert.equal(simulate(70).coolingCapacity, 35);
  assert.equal(simulate(78).coolingCapacity, 100);
  assert.equal(simulate(78).alarm?.active, true);
  assert.equal(simulate(120).alarm?.active, false);
  assert.ok(simulate(120).temperature < 28);
  assert.equal(simulate(0).power, 248);
  assert.ok(simulate(60).power > simulate(0).power);
});

test("整机输入功耗与假设分配守恒，电量按秒积分，未混入制冷功耗", () => {
  const history = temperatureHistory(120);
  let integrated = 0;
  for (const [index, sample] of history.entries()) {
    assert.ok(
      Math.abs(
        sample.allocation.reduce((sum, item) => sum + item.watts, 0) -
          sample.power,
      ) < 1e-8,
    );
    if (index > 0)
      integrated += (history[index - 1].power + sample.power) / 2 / 3600;
    assert.ok(Math.abs(sample.energyWh - integrated) < 1e-10);
    assert.ok(sample.power >= 248 && sample.power <= 260);
  }
  assert.equal(simulate(0).energyWh, 0);
  assert.ok(simulate(120).energyWh > 8 && simulate(120).energyWh < 9);
});

test("告警具有稳定身份、发生和恢复时间，升级降级满足完整持续区间与回差", () => {
  const history = temperatureHistory(120);
  const events = simulate(120).events;
  const checks = [
    ["raised", scenario.warning.threshold, scenario.warning.hold, "above"],
    ["escalated", scenario.critical.threshold, scenario.critical.hold, "above"],
    [
      "downgraded",
      scenario.critical.clear,
      scenario.critical.clearHold,
      "below",
    ],
    ["recovered", scenario.warning.clear, scenario.warning.clearHold, "below"],
  ] as const;
  for (const [kind, threshold, hold, comparison] of checks) {
    const event = events.find((event) => event.kind === kind)!;
    assert.ok(event);
    const window = history.slice(event.time - hold, event.time + 1);
    assert.equal(window.length, hold + 1);
    assert.ok(
      window.every((sample) =>
        comparison === "above"
          ? sample.temperature >= threshold
          : sample.temperature <= threshold,
      ),
    );
    assert.equal(events.filter((e) => e.kind === kind).length, 1);
  }
  assert.equal(simulate(34).alarm, null);
  assert.equal(simulate(35).alarm?.raisedAt, 35);
  assert.equal(simulate(49).alarm?.severity, "critical");
  assert.equal(simulate(83).alarm?.severity, "warning");
  assert.equal(simulate(95).alarm?.recoveredAt, 95);
  assert.equal(simulate(95).alarm?.peakSeverity, "critical");
  assert.equal(simulate(35).alarm?.id, simulate(95).alarm?.id);
  assert.notEqual(simulate(35, 0).alarm?.id, simulate(35, 1).alarm?.id);
});

test("任意拖动顺序得到相同模拟结果，回看不提前显示未来告警和事件", () => {
  const first = simulate(60);
  simulate(120);
  simulate(0);
  assert.deepEqual(simulate(60), first);
  for (let time = 0; time <= scenario.duration; time++) {
    assert.ok(simulate(time).events.every((event) => event.time <= time));
    assert.equal(temperatureHistory(time).length, time + 1);
    assert.equal(temperatureHistory(time).at(-1)?.observedAt, time);
  }
  assert.equal(simulate(30).alarm, null);
  assert.equal(
    simulate(30).events.some((event) => event.kind === "raised"),
    false,
  );
  first.alarm!.active = false;
  assert.equal(simulate(60).alarm?.active, true);
  assert.equal(simulate(-2).observedAt, 0);
  assert.equal(simulate(Infinity).observedAt, 0);
  assert.equal(simulate(1000).observedAt, 120);
});

test("倍速仍保留跳过秒的事件；单次结束停留，循环和重播更新轮次", () => {
  let state = transition(createState(), { type: "rate", rate: 4 });
  state = transition(state, { type: "loop" });
  for (let i = 0; i < 30; i++) state = transition(state, { type: "tick" });
  assert.equal(state.time, 120);
  assert.equal(state.playing, false);
  assert.equal(simulate(state.time).events.length, 8);
  assert.equal(transition(state, { type: "tick" }), state);
  state = transition(state, { type: "replay" });
  assert.equal(state.replayCycle, 1);
  assert.equal(state.time, 0);
  state = transition(state, { type: "loop" });
  for (let i = 0; i < 31; i++) state = transition(state, { type: "tick" });
  assert.equal(state.replayCycle, 2);
  assert.equal(state.time, 0);
});

test("回看只改变时间，定位设备不改时间和模拟状态，巡游与数据播放独立", () => {
  let state = transition(createState(), { type: "seek", time: 60 });
  assert.equal(state.playing, false);
  state = transition(state, { type: "locate", id: "srv-01" });
  assert.equal(state.level, "device");
  assert.equal(state.selected, "srv-01");
  assert.equal(state.time, 60);
  assert.equal(state.playing, false);
  const key = presentationKey(state);
  state = transition(state, { type: "seek", time: 95 });
  assert.equal(presentationKey(state), key);
  assert.equal(transition(state, { type: "locate", id: "unknown" }), state);
  assert.equal(transition(state, { type: "seek", time: NaN }), state);
  let experience = experienceTransition(createExperience(), {
    type: "scene",
    action: { type: "rate", rate: 4 },
  });
  assert.equal(experience.tour.mode, "playing");
  experience = experienceTransition(experience, {
    type: "scene",
    action: { type: "seek", time: 60 },
  });
  assert.equal(experience.tour.mode, "manual");
  assert.equal(experience.scene.time, 60);
});
