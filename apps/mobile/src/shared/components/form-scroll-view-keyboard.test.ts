import { describe, expect, it } from "vitest";

import {
  getFormKeyboardAvoidingBehavior,
  getFocusedInputScrollOffset
} from "./form-scroll-view-keyboard";

describe("form scroll view keyboard behavior", () => {
  it("reduces the available height when the Android keyboard opens", () => {
    expect(getFormKeyboardAvoidingBehavior("android")).toBe("height");
  });

  it("uses padding for iOS and no behavior for other platforms", () => {
    expect(getFormKeyboardAvoidingBehavior("ios")).toBe("padding");
    expect(getFormKeyboardAvoidingBehavior("web")).toBeUndefined();
  });

  it("uses the real viewport position when it begins below a header", () => {
    expect(
      getFocusedInputScrollOffset({
        currentOffsetY: 100,
        scrollViewport: { y: 120, height: 500 },
        focusedInput: { y: 470, height: 60 },
        keyboardTop: 500
      })
    ).toBe(154);
  });

  it("does not move when the focused input is already visible", () => {
    expect(
      getFocusedInputScrollOffset({
        currentOffsetY: 100,
        scrollViewport: { y: 120, height: 500 },
        focusedInput: { y: 300, height: 60 },
        keyboardTop: 500
      })
    ).toBeNull();
  });

  it("scrolls upward without producing a negative offset", () => {
    expect(
      getFocusedInputScrollOffset({
        currentOffsetY: 10,
        scrollViewport: { y: 120, height: 500 },
        focusedInput: { y: 100, height: 40 },
        keyboardTop: 500
      })
    ).toBe(0);
  });
});
