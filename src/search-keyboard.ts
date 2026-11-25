import type { KeyboardEvent } from "react";

export function clearSearchOnEscape(
  event: KeyboardEvent<HTMLInputElement>,
  clear: () => void,
) {
  if (
    event.key !== "Escape" ||
    event.defaultPrevented ||
    event.nativeEvent.isComposing ||
    event.ctrlKey ||
    event.altKey ||
    event.metaKey ||
    event.repeat ||
    !event.currentTarget.value
  )
    return;
  event.preventDefault();
  event.stopPropagation();
  clear();
}
