import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createState, transition, getPath, simulate, metricText } from './domain.ts';

test('逐层进入、跨层返回和非法选择保持一致', () => {
  let state = createState();
  assert.equal(state.level, 'room');
  state = transition(state, { type: 'enter' });
  assert.equal(state.level, 'rack');
  assert.equal(state.selected, 'rack-a01');
  state = transition(state, { type: 'enter' });
  assert.equal(state.level, 'device');
  assert.deepEqual(getPath(state), ['room-01', 'rack-a01', 'srv-01']);
  assert.equal(transition(state, { type: 'select', id: 'unknown' }).selected, state.selected);
  assert.equal(transition(state, { type: 'back' }).level, 'rack');
  assert.equal(transition(createState(), { type: 'back' }).level, 'room');
});

test('同一模拟时刻得到相同结果，零值、缺失、离线和过期分开', () => {
  assert.deepEqual(simulate(30), simulate(30));
  assert.equal(simulate(0).source, 'simulation');
  assert.equal(metricText({ value: 0, unit: 'W', quality: 'valid' }), '0 W');
  assert.equal(metricText({ value: null, unit: 'W', quality: 'missing' }), '未采集');
  assert.equal(metricText({ value: 12, unit: 'W', quality: 'offline' }), '离线');
  assert.equal(metricText({ value: 12, unit: 'W', quality: 'stale' }), '已过期');
});
