export function PowerViewActions({
  active,
  paired,
  ready,
  onObserve,
  onObservePair,
  onReturn,
}: {
  active: boolean;
  paired: boolean;
  ready: boolean;
  onObserve: () => void;
  onObservePair: () => void;
  onReturn: () => void;
}) {
  return (
    <div
      className="power-view-actions"
      role="group"
      aria-label="供电接入观察"
      onKeyDown={(event) => {
        if (event.key === "Escape" && active && ready) {
          event.preventDefault();
          event.stopPropagation();
          onReturn();
        }
      }}
    >
      <button
        disabled={!ready}
        aria-pressed={active && !paired}
        onClick={onObserve}
      >
        同框观察插座与输入
      </button>
      <button
        disabled={!ready}
        aria-pressed={active && paired}
        onClick={onObservePair}
      >
        同时核对 A/B 输入
      </button>
      {active && (
        <button disabled={!ready} onClick={onReturn}>
          返回供电观察前视角
        </button>
      )}
    </div>
  );
}
