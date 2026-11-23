import { racewayNeighbors } from "../panel-raceway";
import {
  panelPortLabel,
  panelTermination,
  portAtPanel,
  type PanelPort,
} from "../patch-panels";
import type { RoomFixture } from "../fixtures";

export function PanelRacewayDetails({
  fixture,
  origin,
  ready,
  onLocate,
  onRegister,
}: {
  fixture: RoomFixture;
  origin: PanelPort | null;
  ready: boolean;
  onLocate: (id: string) => void;
  onRegister: (entry: HTMLButtonElement) => void;
}) {
  const neighbors = racewayNeighbors(fixture.id);
  if (!neighbors.length) return null;
  const termination = origin && panelTermination(origin);
  const atSection = "sectionSize" in fixture;
  return (
    <section className="panel-port-details" aria-label="线槽布置">
      <strong>{atSection ? "相接位置" : "箱顶入口"}</strong>
      {atSection && (
        <p>
          {fixture.sectionSize[0] > fixture.sectionSize[1]
            ? `横段外缘跨度 ${fixture.sectionSize[0].toFixed(3)} m`
            : `箱顶至横槽下缘 ${fixture.sectionSize[1].toFixed(3)} m`}{" "}
          · 样板配置
        </p>
      )}
      {atSection && origin && (
        <div className="raceway-registration">
          <strong>
            {termination ? `端接登记 · ${termination.id}` : "对端未登记"}
          </strong>
          <span>起点　{panelPortLabel(origin)}</span>
          {termination && <span>对端　{panelPortLabel(termination.peer)}</span>}
          <small>槽内敷线待核实</small>
        </div>
      )}
      <button
        data-start-panel-register
        disabled={!ready}
        onClick={(e) => onRegister(e.currentTarget)}
      >
        核对双端孔位 ↗
      </button>
      {neighbors.map((peer) => {
        const port = origin && portAtPanel(origin, peer.id);
        return (
          <button
            key={peer.id}
            disabled={!ready}
            onClick={() => onLocate(peer.id)}
          >
            核对{port ? panelPortLabel(port) : peer.name}
          </button>
        );
      })}
    </section>
  );
}
