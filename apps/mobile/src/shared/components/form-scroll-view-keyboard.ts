export const FORM_KEYBOARD_EXTRA_OFFSET = 24;

export type FormKeyboardAvoidingBehavior = "height" | "padding" | undefined;

export type KeyboardScrollable = {
  scrollResponderScrollNativeHandleToKeyboard(
    target: unknown,
    additionalOffset?: number,
    preventNegativeScrollOffset?: boolean
  ): void;
};

export function getFormKeyboardAvoidingBehavior(
  platform: string
): FormKeyboardAvoidingBehavior {
  if (platform === "android") {
    return "height";
  }

  if (platform === "ios") {
    return "padding";
  }

  return undefined;
}

export function scrollFocusedInputIntoView(
  scrollView: KeyboardScrollable | null,
  target: unknown
): void {
  if (scrollView === null || target === null || target === undefined) {
    return;
  }

  scrollView.scrollResponderScrollNativeHandleToKeyboard(
    target,
    FORM_KEYBOARD_EXTRA_OFFSET,
    true
  );
}
