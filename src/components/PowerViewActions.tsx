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
      <select
        aria-label="供电观察范围"
        value={active ? (paired ? "pair" : "single") : ""}
        disabled={!ready}
        onChange={(event) => {
          if (event.target.value === "pair") onObservePair();
          else onObserve();
        }}
      >
        <option value="" disabled>
          选择观察范围
        </option>
        <option value="single">单路插座与输入</option>
        <option value="pair">A/B 双输入</option>
      </select>
      {active && (
        <button disabled={!ready} onClick={onReturn}>
          返回原视角
        </button>
      )}
    </div>
  );
}
