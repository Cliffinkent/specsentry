import { describe, expect, it } from "vitest";
import { playwrightKeypress } from "@/lib/executor/keyboard-policy";

describe("computer keypress policy", () => {
  it("executes the safe select-all chord as one Playwright keypress", () => {
    expect(playwrightKeypress(["CTRL", "A"])).toBe("Control+A");
    expect(playwrightKeypress(["CTRL+A"])).toBe("Control+A");
  });

  it("allows safe focus and editing keys", () => {
    expect(playwrightKeypress(["TAB"])).toBe("Tab");
    expect(playwrightKeypress(["SHIFT", "TAB"])).toBe("Shift+Tab");
    expect(playwrightKeypress(["BACKSPACE"])).toBe("Backspace");
  });

  it("rejects an ambiguous sequence encoded as one key combination", () => {
    expect(() => playwrightKeypress(["TAB", "ENTER"])).toThrow("blocked browser or system shortcut");
  });

  it.each([
    [["CTRL", "L"]],
    [["META", "R"]],
    [["ALT", "ARROWLEFT"]],
    [["F6"]],
    [["CTRL"]],
  ])("blocks browser and system shortcut %j", (keys) => {
    expect(() => playwrightKeypress(keys)).toThrow("blocked browser or system shortcut");
  });
});
