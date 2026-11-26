import {
  Component,
  createRef,
  type ComponentPropsWithoutRef,
  type RefObject,
} from "react";

type ListProps = ComponentPropsWithoutRef<"div"> & {
  listRef?: RefObject<HTMLDivElement | null>;
};

function visible(element: HTMLElement) {
  const { left, width, top, height, bottom } = element.getBoundingClientRect();
  if (!width || !height) return false;

  const x = left + width / 2;
  const inset = Math.min(height / 2, 1);
  const hit = (y: number) =>
    element.contains(element.ownerDocument.elementFromPoint(x, y));
  return hit(top + inset) && hit(bottom - inset);
}

export class FocusedResultList extends Component<
  ListProps,
  object,
  HTMLElement | null
> {
  private list = createRef<HTMLDivElement>();

  getSnapshotBeforeUpdate(): HTMLElement | null {
    // 在结果重新排列前取样，区分失去可见性和用户主动滚离。
    const list = (this.props.listRef ?? this.list).current;
    const active = list?.ownerDocument.activeElement;
    return active instanceof HTMLElement &&
      active !== list &&
      list?.contains(active) &&
      visible(active)
      ? active
      : null;
  }

  componentDidUpdate(
    _previousProps: Readonly<ListProps>,
    _previousState: Readonly<object>,
    focused: HTMLElement | null,
  ) {
    if (
      focused &&
      focused === focused.ownerDocument.activeElement &&
      !visible(focused)
    )
      focused.scrollIntoView({ block: "nearest" });
  }

  render() {
    const { listRef, ...props } = this.props;
    return <div {...props} ref={listRef ?? this.list} />;
  }
}
