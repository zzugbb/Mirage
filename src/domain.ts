export type Level = 'room' | 'rack' | 'device';
export type Entity = { id: string; name: string; kind: 'room' | 'rack' | 'device' | 'facility' | 'part'; parent?: string; description: string };
export const entities: Entity[] = [
  { id: 'room-01', name: '01号机房', kind: 'room', description: '8 × 6 m 原创示意空间，采用剖切展示。' },
  { id: 'rack-a01', name: 'A01 机柜', kind: 'rack', parent: 'room-01', description: '42U 标准尺度示意机柜，含一台代表性服务器。' },
  { id: 'srv-01', name: 'SRV-01 服务器', kind: 'device', parent: 'rack-a01', description: '通用 2U 服务器结构示意，不对应实际厂商机型。' },
  { id: 'cooling-01', name: '制冷单元', kind: 'facility', parent: 'room-01', description: '风冷设施示意，尚未进行热流体仿真。' },
  { id: 'power-01', name: '配电柜', kind: 'facility', parent: 'room-01', description: '配电设施示意，尚未建立供电连接关系。' },
];
export const entityById = (id: string) => entities.find(entity => entity.id === id);
export type AppState = { level: Level; selected: string; focusRevision: number; time: number; playing: boolean };
export type Action = { type: 'select'; id: string } | { type: 'navigate'; level: Level } | { type: 'enter' | 'back' | 'focus' | 'reset' | 'play' | 'tick' };
export const createState = (): AppState => ({ level: 'room', selected: 'room-01', focusRevision: 0, time: 0, playing: false });
const ids: Record<Level, string> = { room: 'room-01', rack: 'rack-a01', device: 'srv-01' };
export const getPath = (state: AppState) => ['room-01', ...(state.level !== 'room' ? ['rack-a01'] : []), ...(state.level === 'device' ? ['srv-01'] : [])];
export function transition(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'select': return entityById(action.id) ? { ...state, selected: action.id } : state;
    case 'navigate': return { ...state, level: action.level, selected: ids[action.level], focusRevision: state.focusRevision + 1 };
    case 'enter': return transition(state, { type: 'navigate', level: state.level === 'room' ? 'rack' : 'device' });
    case 'back': return transition(state, { type: 'navigate', level: state.level === 'device' ? 'rack' : 'room' });
    case 'focus': return { ...state, focusRevision: state.focusRevision + 1 };
    case 'reset': return { ...createState(), focusRevision: state.focusRevision + 1 };
    case 'play': return { ...state, playing: !state.playing };
    case 'tick': return state.playing ? { ...state, time: (state.time + 1) % 121 } : state;
  }
}
export type Metric = { value: number | null; unit: string; quality: 'valid' | 'missing' | 'offline' | 'stale' };
export const metricText = (metric: Metric) => metric.quality === 'offline' ? '离线' : metric.quality === 'stale' ? '已过期' : metric.value === null || metric.quality === 'missing' ? '未采集' : `${metric.value} ${metric.unit}`;
export function simulate(time: number) {
  const t = Math.max(0, Math.min(120, time));
  const temperature = Math.round((32 + 2 * Math.sin(t / 15)) * 10) / 10;
  return { source: 'simulation' as const, observedAt: t, temperature, power: Math.round(248 + 12 * Math.sin(t / 9)), health: '正常' };
}
