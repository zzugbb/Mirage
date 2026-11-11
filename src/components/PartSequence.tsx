import type { partInspectionSequence } from "../part-inspection";
export function PartSequence({
  sequence,
  ready,
  onSelect,
  onFinish,
}: {
  sequence: NonNullable<ReturnType<typeof partInspectionSequence>>;
  ready: boolean;
  onSelect: (id: string, action: string) => void;
  onFinish: () => void;
}) {
  const { parent, siblings, index, previous, next, children } = sequence;
  return (
    <section className="part-sequence" aria-label="逐部件检视">
      <strong tabIndex={-1} data-part-action="heading">
        {parent ? `${parent.name} · 子件` : "设备模块"} · {index + 1}/
        {siblings.length}
      </strong>
      <div>
        <button
          data-part-action="previous"
          disabled={!ready || !previous}
          onClick={() => previous && onSelect(previous.id, "previous")}
        >
          上一个部件
        </button>
        <button
          data-part-action="next"
          disabled={!ready || !next}
          onClick={() => next && onSelect(next.id, "next")}
        >
          下一个部件
        </button>
      </div>
      {parent && (
        <button
          data-part-action="parent"
          disabled={!ready}
          onClick={() => onSelect(parent.id, "heading")}
        >
          返回{parent.name}
        </button>
      )}
      {children.length > 0 && (
        <button
          data-part-action="children"
          disabled={!ready}
          onClick={() => onSelect(children[0].id, "heading")}
        >
          检视子件 · {children.length} 项
        </button>
      )}
      <button disabled={!ready} onClick={onFinish}>
        返回完整结构
      </button>
      <small>
        按当前机型配置顺序浏览，不代表拆装步骤；部件读数仍为模型推导。
      </small>
    </section>
  );
}
