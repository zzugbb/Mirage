import { smokePlacement } from "../smoke-inspection";
export function SmokeInspection({
  origin,
  selected,
  ready,
  returning,
  onStart,
  onPreview,
  onLocate,
  onReturn,
  onEnd,
}: {
  origin: string | null;
  selected: string;
  ready: boolean;
  returning: boolean;
  onStart: () => void;
  onPreview: (id: string) => void;
  onLocate: (id: string) => void;
  onReturn: () => void;
  onEnd: () => void;
}) {
  const rows = smokePlacement(origin ?? selected)!;
  return (
    <section
      className="smoke-inspection"
      aria-label="烟感布置核对"
      onKeyDown={(event) => {
        if (event.key === "Escape" && origin) {
          event.preventDefault();
          event.stopPropagation();
          if (ready && !returning) onReturn();
        }
      }}
    >
      {!origin ? (
        <button data-smoke-start disabled={!ready} onClick={onStart}>
          逐点核对烟感布置 ↗
        </button>
      ) : (
        <>
          <strong>烟感逐点核对 · {rows.length} 处配置</strong>
          <p>
            预览只切换对象；近看沿已配置的下方视角定位。位置与间距不是探测范围。
          </p>
          {rows.map((row) => (
            <article
              key={row.id}
              aria-current={selected === row.id ? "true" : undefined}
            >
              <strong>
                {row.name}
                {row.id === origin ? " · 起点" : ""}
              </strong>
              <small>
                {row.location} · 中心高 {row.position[1].toFixed(2)} m
              </small>
              <small>
                X / Y / Z：
                {row.position.map((value) => value.toFixed(2)).join(" / ")} m
              </small>
              {row.id !== origin && (
                <small>
                  距起点中心 {row.distance.toFixed(2)} m · 直线配置距离
                </small>
              )}
              <div>
                <button
                  disabled={!ready || returning}
                  aria-pressed={selected === row.id}
                  onClick={() => onPreview(row.id)}
                >
                  预览{row.name}
                </button>
                <button
                  disabled={!ready || returning}
                  onClick={() => onLocate(row.id)}
                >
                  近看{row.name}安装位
                </button>
              </div>
            </article>
          ))}
          <p>
            未接入烟感信号、消防联动或设施告警。两点不表示接线关系、监测覆盖或安装合规性。
          </p>
          <div>
            <button disabled={!ready || returning} onClick={onReturn}>
              ← 返回起点烟感
            </button>
            <button disabled={returning} onClick={onEnd}>
              结束烟感核对
            </button>
          </div>
          <small>
            返回重新定位起点，保留最新时间；不恢复旧镜头或已归位设备。
          </small>
        </>
      )}
    </section>
  );
}
