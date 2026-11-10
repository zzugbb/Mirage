export function PowerViewActions({
  active,
  ready,
  onObserve,
  onReturn,
}: {
  active: boolean;
  ready: boolean;
  onObserve: () => void;
  onReturn: () => void;
}) {
  return (
    <div className="power-view-actions" role="group" aria-label="供电接入观察">
      <button disabled={!ready} aria-pressed={active} onClick={onObserve}>
        同框观察插座与输入
      </button>
      {active && (
        <button disabled={!ready} onClick={onReturn}>
          返回供电观察前视角
        </button>
      )}
    </div>
  );
}
