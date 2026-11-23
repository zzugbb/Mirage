import type { GrilleSeat } from "../grille-seat";
import { floorGrilleSettings as s } from "../floor-grilles";

export function GrilleSeatDetails({
  seat,
  ready,
  onView,
  onHistory,
}: {
  seat: GrilleSeat;
  ready: boolean;
  onView: (index: number, removed: boolean) => void;
  onHistory: (id: string) => void;
}) {
  const branch = seat.branch;
  return (
    <div className="roof-entry-details">
      <label>
        {seat.row.name}
        <select
          aria-label="核对格栅块"
          value={seat.index}
          disabled={!ready}
          onChange={(e) => onView(Number(e.target.value), false)}
        >
          {seat.tiles.map((tile, i) => {
            const branch = seat.branches.find((b) => b.grille.id === tile.id);
            return (
              <option key={tile.id} value={i}>
                {String(i + 1).padStart(2, "0")} 号
                {branch ? " · " + branch.rack.name : ""}
              </option>
            );
          })}
        </select>
      </label>
      <p>
        {seat.removed
          ? "面框和横条已移开，四边承托与背衬留在原位。"
          : `面框与 ${s.slatCount} 根横条齐平。移开这一块可查看固定承托边。`}
      </p>
      <button
        disabled={!ready}
        onClick={() => onView(seat.index, !seat.removed)}
      >
        {seat.removed ? "放回面框与横条" : "移开面框与横条"}
      </button>
      <svg
        className="grille-seat-section"
        viewBox="-24 -12 100 48"
        role="img"
        aria-label="面框边缘剖面，固定承托边位于地板开口内侧，浅凹背衬在下方"
      >
        <rect x="-24" y={0} width={24} height={36} fill="#506575" />
        <rect
          x={0}
          y={s.frameHeight * 1000}
          width={s.seatWidth * 1000}
          height={s.seatThickness * 1000}
          fill={s.seatColor}
        />
        <rect
          x={0}
          y={(s.recessDepth - s.backingThickness) * 1000}
          width={76}
          height={s.backingThickness * 1000}
          fill="#697784"
        />
        <rect
          x={0}
          y={0}
          width={s.frameWidth * 1000}
          height={s.frameHeight * 1000}
          fill={seat.removed ? "none" : s.frameColor}
          stroke="#b4c5ca"
          strokeWidth={0.4}
          strokeDasharray={seat.removed ? "1.4 1.1" : undefined}
        />
        <text x="-20" y="-3">
          地面
        </text>
        <text x="2" y="-3">
          {seat.removed ? "面框原位" : "面框"}
        </text>
        <path
          d={`M ${s.seatWidth * 1000} ${(s.frameHeight + s.seatThickness / 2) * 1000} h 12 l 4 -5`}
          fill="none"
          stroke="#b4c5ca"
          strokeWidth={0.4}
        />
        <text x="32" y="16">
          承托边
        </text>
        <text x="43" y="34">
          背衬
        </text>
      </svg>
      <dl className="grille-seat-sizes">
        <div>
          <dt>地板开口</dt>
          <dd>
            {s.width * 1000} × {s.depth * 1000} mm
          </dd>
        </div>
        <div>
          <dt>承托伸入 / 顶面下沉</dt>
          <dd>
            {s.seatWidth * 1000} / {s.frameHeight * 1000} mm
          </dd>
        </div>
        <div>
          <dt>承托面至背衬顶面</dt>
          <dd>
            {(
              (s.recessDepth - s.backingThickness - s.frameHeight) *
              1000
            ).toFixed(0)}{" "}
            mm
          </dd>
        </div>
      </dl>
      {branch ? (
        <button disabled={!ready} onClick={() => onHistory(branch.rack.id)}>
          回看{branch.rack.name}设备汇总 ↗
        </button>
      ) : (
        <small>
          此块未用作代表气流落点。编号旁标有机柜的格栅可回看对应设备汇总。
        </small>
      )}
      <small>承托与移开状态为原创安装示意。风腔、现场承载和风量待核实。</small>
    </div>
  );
}
