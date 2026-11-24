import type { EntranceInspection, EntranceView } from "../entrance-view";

type Section = Extract<EntranceInspection, { view: "section" }>["section"];

function FrameSectionPlan({ section }: { section: Section }) {
  const { current, footprints } = section;
  const frame = [...footprints.leftJamb, ...footprints.rightJamb];
  const left = Math.min(...frame.map((point) => point.x)) - 0.055;
  const back = Math.min(...frame.map((point) => point.z)) - 0.05;
  const span = section.outerWidth + 0.11;
  const depth = Math.max(...frame.map((point) => point.z)) - back + 0.14;
  return (
    <svg
      className="entrance-frame-plan"
      role="img"
      aria-label={`框内截面俯视，室内在下。${current.label}横向可用跨度 ${current.width.toFixed(3)} 米`}
      viewBox={`${left} ${back} ${span} ${depth}`}
    >
      {[footprints.leftJamb, footprints.rightJamb, footprints.leaf].map(
        (polygon, index) => (
          <polygon
            key={index}
            points={polygon.map(({ x, z }) => `${x},${z}`).join(" ")}
            fill={polygon === footprints.leaf ? "#506a7b" : "#8296a2"}
            stroke="#b3c8d4"
            strokeWidth={0.006}
          />
        ),
      )}
      <path
        d={`M ${left} ${current.z} h ${span}`}
        fill="none"
        stroke="#a7bac5"
        strokeDasharray="0.018 0.012"
        strokeWidth={0.007}
      />
      <path
        d={`M ${current.left.x} ${current.z} H ${current.right.x}`}
        stroke="#99e0d7"
        strokeWidth={0.016}
      />
      {[current.left, current.right].map(({ x, z }) => (
        <path
          key={x}
          d={`M ${x} ${z - 0.028} v 0.056`}
          stroke="#99e0d7"
          strokeWidth={0.009}
        />
      ))}
      <text
        x={left + span - 0.055}
        y={back + depth - 0.026}
        textAnchor="end"
        fontSize={0.061}
        fill="#a7bac5"
      >
        室内侧
      </text>
    </svg>
  );
}

export function EntranceFrameSectionDetails({
  section,
  ready,
  onSample,
  onView,
  onReader,
}: {
  section: Section;
  ready: boolean;
  onSample: (index: number) => void;
  onView: (view: EntranceView) => void;
  onReader: () => void;
}) {
  const { current, height, frameWidth, outerWidth, angle } = section;
  return (
    <section className="entrance-view-details" aria-label="入口布置核对">
      <strong>框内截面 · 配置</strong>
      <label className="entrance-section-position">
        截面位置
        <select
          value={section.selected}
          disabled={!ready}
          onChange={(event) => onSample(Number(event.target.value))}
        >
          {section.samples.map(({ index, label }) => (
            <option key={index} value={index}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <dl>
        <div>
          <dt>截面可用跨度</dt>
          <dd>{current.width.toFixed(3)} m</dd>
        </div>
        <div>
          <dt>洞口外缘 / 两框内缘</dt>
          <dd>
            {outerWidth.toFixed(3)} / {frameWidth.toFixed(3)} m
          </dd>
        </div>
        <div>
          <dt>距室内框口 / 截面标高</dt>
          <dd>
            {current.depth.toFixed(3)} / {height.toFixed(4)} m
          </dd>
        </div>
        <div>
          <dt>门扇展示角</dt>
          <dd>{Math.round((Math.abs(angle) * 180) / Math.PI)}° · 静态</dd>
        </div>
      </dl>
      <FrameSectionPlan section={section} />
      <small>
        {current.obstacle === "leaf"
          ? "从截面内的门扇右缘量至右框内缘。"
          : "这一截面未与门扇相交，量取两框内缘。"}
        样板仅核对门框和门扇，实际通行净宽与五金影响待核实。
      </small>
      <div className="entrance-view-peer">
        <button disabled={!ready} onClick={() => onView("opening")}>
          返回洞口尺寸
        </button>
        <button disabled={!ready} onClick={onReader}>
          核对读卡器与洞口侧缘 ↗
        </button>
      </div>
    </section>
  );
}
