import { describe, expect, it, vi } from "vitest";

import {
  FORM_KEYBOARD_EXTRA_OFFSET,
  getFormKeyboardAvoidingBehavior,
  scrollFocusedInputIntoView,
  type KeyboardScrollable
} from "./form-scroll-view-keyboard";

describe("form scroll view keyboard behavior", () => {
  it("reduces the available height when the Android keyboard opens", () => {
    expect(getFormKeyboardAvoidingBehavior("android")).toBe("height");
  });

  it("uses padding for iOS and no behavior for other platforms", () => {
    expect(getFormKeyboardAvoidingBehavior("ios")).toBe("padding");
    expect(getFormKeyboardAvoidingBehavior("web")).toBeUndefined();
  });

  it("keeps the focused input above the keyboard with a safe offset", () => {
    const target = { nativeTag: 42 };
    const scrollToKeyboard = vi.fn();
    const scrollView: KeyboardScrollable = {
      scrollResponderScrollNativeHandleToKeyboard: scrollToKeyboard
    };

    scrollFocusedInputIntoView(scrollView, target);

    expect(scrollToKeyboard).toHaveBeenCalledOnce();
    expect(scrollToKeyboard).toHaveBeenCalledWith(
      target,
      FORM_KEYBOARD_EXTRA_OFFSET,
      true
    );
  });

  it("does nothing without a scroll view or focused target", () => {
    const scrollToKeyboard = vi.fn();
    const scrollView: KeyboardScrollable = {
      scrollResponderScrollNativeHandleToKeyboard: scrollToKeyboard
    };

    scrollFocusedInputIntoView(null, { nativeTag: 42 });
    scrollFocusedInputIntoView(scrollView, null);

    expect(scrollToKeyboard).not.toHaveBeenCalled();
  });
});
