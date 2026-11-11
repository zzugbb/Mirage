import type { EnvironmentInspection } from "../environment-view";
export function EnvironmentViewActions({
  inspection,
  ready,
  available,
  onObserve,
  onReturn,
}: {
  inspection: EnvironmentInspection | null;
  ready: boolean;
  available: boolean;
  onObserve: () => void;
  onReturn: () => void;
}) {
  return (
    <div
      className="environment-view-actions"
      onKeyDown={(event) => {
        if (event.key === "Escape" && inspection && ready) {
          event.preventDefault();
          event.stopPropagation();
          onReturn();
        }
      }}
    >
      <button
        disabled={!ready || !available}
        aria-pressed={!!inspection}
        onClick={onObserve}
      >
        同框观察两测点
      </button>
      {inspection && (
        <button disabled={!ready} onClick={onReturn}>
          返回观察前视角
        </button>
      )}
      {!available && <small>先定位任一测点，完成机构归位后观察。</small>}
    </div>
  );
}
