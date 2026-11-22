import { switchCageBanks, type switchCageSelection } from "../switch-cages";

export function FrontCageControls({
  selection: { bank: cageBank, insert: cageInsert, showCage },
  disabled,
  onChange,
}: {
  selection: ReturnType<typeof switchCageSelection>;
  disabled: boolean;
  onChange: (scopeId?: string) => void;
}) {
  return (
    <>
      <select
        aria-label="导光组件范围"
        disabled={disabled}
        value={cageBank?.id ?? ""}
        onChange={(event) => {
          const next = switchCageBanks.find(
            (bank) => bank.id === event.target.value,
          );
          const insert =
            next &&
            cageInsert &&
            next.inserts.find(
              (item) =>
                item.row === cageInsert.row &&
                item.column === Math.min(cageInsert.column, next.columns),
            );
          onChange((showCage ? insert?.cageId : insert?.id) ?? next?.id);
        }}
      >
        <option value="">整排</option>
        {switchCageBanks.map((bank) => (
          <option key={bank.id} value={bank.id}>
            {bank.columns} 列笼组
          </option>
        ))}
      </select>
      {cageBank && (
        <select
          aria-label="笼内核查位置"
          disabled={disabled}
          value={cageInsert?.id ?? cageBank.id}
          onChange={(event) => {
            const next = cageBank.inserts.find(
              (item) => item.id === event.target.value,
            );
            onChange((showCage ? next?.cageId : next?.id) ?? cageBank.id);
          }}
        >
          <option value={cageBank.id}>导光组件</option>
          <optgroup label="承片 · 从机前左侧起算">
            {cageBank.inserts.map((insert) => (
              <option key={insert.id} value={insert.id}>
                {insert.label}
              </option>
            ))}
          </optgroup>
        </select>
      )}
      {cageInsert && (
        <button
          disabled={disabled}
          aria-pressed={showCage}
          onClick={() => onChange(showCage ? cageInsert.id : cageInsert.cageId)}
        >
          看笼位
        </button>
      )}
    </>
  );
}
