import {
  condensate,
  condensateSource,
  mouthGap,
  nearestCondensateSensing as nearest,
} from "../condensate";

export function CondensateDetails({
  id,
  ready,
  onLocate,
  onSense,
}: {
  id: string;
  ready: boolean;
  onLocate: (id: string) => void;
  onSense: () => void;
}) {
  const { pipe, receiver } = condensate;
  const atPipe = id === pipe.id,
    atReceiver = id === receiver.id;
  const related = atPipe
    ? [receiver, condensateSource]
    : atReceiver
      ? [pipe]
      : id === condensate.sensingCableId
        ? [receiver]
        : [pipe];
  return (
    <section className="panel-port-details" aria-label="冷凝水排水布置">
      <strong>冷凝水排水布置</strong>
      {atPipe && (
        <p>
          管口高 {condensate.mouthHeight.toFixed(3)} m，距斗口上缘{" "}
          {mouthGap.toFixed(3)} m。
        </p>
      )}
      {atReceiver && (
        <p>
          斗口高 {condensate.rimHeight.toFixed(3)} m。斗口中心至感应段{" "}
          {nearest.segment} 的平面距离为 {nearest.distance.toFixed(3)} m。
        </p>
      )}
      {related.map((peer) => (
        <button
          key={peer.id}
          disabled={!ready}
          onClick={() => onLocate(peer.id)}
        >
          定位{peer.name}
        </button>
      ))}
      {atReceiver && (
        <button disabled={!ready} onClick={onSense}>
          定位最近感应点 · 距接头 {nearest.fromJoint.toFixed(3)} m
        </button>
      )}
      {(atPipe || atReceiver) && (
        <p>
          按样板安装配置核对。实际接口及斗后去向待核实，水量、水位与检漏信号均未接入。
        </p>
      )}
    </section>
  );
}
