export function InletViewActions({
  active,
  ready,
  available,
  onObserve,
  onReturn,
}: {
  active: boolean;
  ready: boolean;
  available: boolean;
  onObserve: () => void;
  onReturn: () => void;
}) {
  return (
    <div
      className="inlet-view-actions"
      onKeyDown={(event) => {
        if (event.key === "Escape" && active && ready) {
          event.preventDefault();
          event.stopPropagation();
          onReturn();
        }
      }}
    >
      <button
        disabled={!ready || !available}
        aria-pressed={active}
        onClick={onObserve}
      >
        同框观察两台设备
      </button>
      {active && (
        <button disabled={!ready} onClick={onReturn}>
          返回观察前视角
        </button>
      )}
      {!available && (
        <small>在机房温度视图中观察；设备检视后先安全归位。</small>
      )}
    </div>
  );
}
