const aliases: Record<string, string> = {
  CTRL: "Control",
  CONTROL: "Control",
  SHIFT: "Shift",
  TAB: "Tab",
  ENTER: "Enter",
  ESC: "Escape",
  ESCAPE: "Escape",
  SPACE: "Space",
  BACKSPACE: "Backspace",
  DELETE: "Delete",
  ARROWUP: "ArrowUp",
  ARROWDOWN: "ArrowDown",
  ARROWLEFT: "ArrowLeft",
  ARROWRIGHT: "ArrowRight",
  HOME: "Home",
  END: "End",
  PAGEUP: "PageUp",
  PAGEDOWN: "PageDown",
};

function normalizeKey(key: string) {
  const trimmed = key.trim();
  return aliases[trimmed.toUpperCase()] || trimmed;
}

export function playwrightKeypress(keys: string[]) {
  const normalized = keys.flatMap((key) => key.split("+")).map(normalizeKey).filter(Boolean);
  if (normalized.length === 0 || normalized.length > 3) {
    throw new Error("The model requested an invalid keypress.");
  }

  if (normalized.length === 1) {
    const [key] = normalized;
    if (/^(Control|Meta|Alt|Shift|F\d{1,2})$/i.test(key)) {
      throw new Error("The model requested a blocked browser or system shortcut.");
    }
    return key;
  }

  const chord = normalized.join("+");
  if (chord === "Control+A" || chord === "Shift+Tab") return chord;
  throw new Error("The model requested a blocked browser or system shortcut.");
}
