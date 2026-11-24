import type { DoorReference } from "../door-sweep";
import type { GrilleSeat } from "../grille-seat";
import { floorGrilleSettings as s } from "../floor-grilles";

type GrilleDetailsProps = {
  seat: GrilleSeat;
  ready: boolean;
  onView: (
    index: number,
    removed: boolean,
    reference?: DoorReference,
    rackId?: string,
  ) => void;
  onHistory: (id: string) => void;
  onIntake?: () => void;
};

export function GrilleSeatDetails({
  seat,
  ready,
  onView,
  onHistory,
  onIntake,
}: GrilleDetailsProps) {
  const { branch, front, reference } = seat;
  return (
    <div className="roof-entry-details">
      <label>
        {seat.row.name}
        <select
          aria-label="核对格栅块"
          value={seat.index}
          disabled={!ready}
          onChange={(e) =>
            onView(Number(e.target.value), false, reference, front?.area.rackId)
          }
        >
          {seat.tiles.map((tile, i) => {
            const cabinetNames = reference
              ? seat.layout?.[i].map((f) => f.area.rackName).join("、") ||
                "无相交"
              : seat.branches.find((b) => b.grille.id === tile.id)?.rack.name;
            return (
              <option key={tile.id} value={i}>
                {String(i + 1).padStart(2, "0")} 号
                {cabinetNames ? " · " + cabinetNames : ""}
              </option>
            );
          })}
        </select>
      </label>
      <button
        disabled={!ready}
        onClick={() =>
          onView(seat.index, seat.removed, reference ? undefined : "peak")
        }
      >
        {reference ? "返回格栅安装剖面" : "核对柜前预留与门扇"}
      </button>
      {reference ? (
        <GrilleFrontDetails
          seat={seat}
          reference={reference}
          ready={ready}
          onView={onView}
          onHistory={onHistory}
        />
      ) : (
        <>
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
            <>
              {onIntake && (
                <button disabled={!ready} onClick={onIntake}>
                  核对落点与进风位置 ↗
                </button>
              )}
              <button
                disabled={!ready}
                onClick={() => onHistory(branch.rack.id)}
              >
                回看{branch.rack.name}设备汇总 ↗
              </button>
            </>
          ) : (
            <small>
              此块未用作代表气流落点。编号旁标有机柜的格栅可回看对应设备汇总。
            </small>
          )}
          <small>
            承托与移开状态为原创安装示意。风腔、现场承载和风量待核实。
          </small>
        </>
      )}
    </div>
  );
}

function GrilleFrontDetails({
  seat,
  reference,
  ready,
  onView,
  onHistory,
}: GrilleDetailsProps & { reference: DoorReference }) {
  const front = seat.front;
  return (
    <>
      {front ? (
        <>
          {seat.fronts.length > 1 && (
            <label>
              核对机柜
              <select
                value={front.area.rackId}
                onChange={(e) =>
                  onView(seat.index, seat.removed, reference, e.target.value)
                }
                disabled={!ready}
              >
                {seat.fronts.map((f) => (
                  <option key={f.area.rackId} value={f.area.rackId}>
                    {f.area.rackName}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            前门扫掠范围
            <select
              aria-label="前门扫掠范围"
              disabled={!ready}
              value={reference}
              onChange={(e) =>
                onView(
                  seat.index,
                  seat.removed,
                  e.target.value as DoorReference,
                  front.area.rackId,
                )
              }
            >
              <option value="peak">
                闭合至最大进深 · {front.door.peak.angle}°
              </option>
              <option value="open">
                闭合至配置全开 · {front.door.open.angle}°
              </option>
            </select>
          </label>
          <dl className="grille-seat-sizes">
            <div>
              <dt>柜前操作预留</dt>
              <dd>{front.area.rackName}</dd>
            </div>
            <div>
              <dt>开口落入预留</dt>
              <dd>
                {front.overlap
                  ? front.overlap.contained
                    ? "整块"
                    : "部分"
                  : "无重叠"}
              </dd>
            </div>
            {front.overlap && (
              <div>
                <dt>落入宽 × 深</dt>
                <dd>
                  {Math.round(front.overlap.overlapWidth * 1000)} ×{" "}
                  {Math.round(front.overlap.overlapDepth * 1000)} mm
                </dd>
              </div>
            )}
            <div>
              <dt>扫过开口面积</dt>
              <dd>
                {front.sweep.area > 0 && front.sweep.area * 10000 < 0.1
                  ? "< 0.1"
                  : (front.sweep.area * 10000).toFixed(1)}{" "}
                cm²
              </dd>
            </div>
          </dl>
          <button
            disabled={!ready}
            onClick={() => onHistory(front.area.rackId)}
          >
            回看{front.area.rackName}设备汇总 ↗
          </button>
        </>
      ) : (
        <p>本排已配置机柜的柜前预留和前门扫掠均未与此开口重叠。</p>
      )}
      <small>
        按地板开口和配置门扇计算水平投影。移开面框后仍按原开口核对，现场作业净距待实测。
      </small>
    </>
  );
}
