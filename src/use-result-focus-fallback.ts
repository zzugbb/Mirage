import { useCallback, useLayoutEffect, useRef, type RefObject } from "react";

export function useResultFocusFallback(
  fallback: RefObject<HTMLElement | null>,
) {
  const removedFocus = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const previous = removedFocus.current;
    removedFocus.current = null;
    if (!previous || previous.isConnected) return;
    const owner = previous.ownerDocument;
    // 显式返回可能已把焦点交给另一个操作。
    if (owner.activeElement === owner.body) fallback.current?.focus();
  });

  return useCallback((result: HTMLElement | null) => {
    if (!result) return;
    return () => {
      // ref 清理时结果仍在页面上，可以读取移除前的焦点。
      if (result.contains(result.ownerDocument.activeElement))
        removedFocus.current = result;
    };
  }, []);
}
