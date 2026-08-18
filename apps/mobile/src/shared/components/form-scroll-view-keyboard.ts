export const FORM_KEYBOARD_EXTRA_OFFSET = 24;

export type FormKeyboardAvoidingBehavior = "height" | "padding" | undefined;

export type WindowRectangle = {
  y: number;
  height: number;
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

type FocusedInputScrollOffsetOptions = {
  currentOffsetY: number;
  scrollViewport: WindowRectangle;
  focusedInput: WindowRectangle;
  keyboardTop: number;
};

export function getFocusedInputScrollOffset({
  currentOffsetY,
  scrollViewport,
  focusedInput,
  keyboardTop
}: FocusedInputScrollOffsetOptions): number | null {
  const viewportTop = scrollViewport.y;
  const viewportBottom = Math.min(viewportTop + scrollViewport.height, keyboardTop);
  const visibleTop = viewportTop + FORM_KEYBOARD_EXTRA_OFFSET;
  const visibleBottom = viewportBottom - FORM_KEYBOARD_EXTRA_OFFSET;

  if (visibleBottom <= visibleTop) {
    return null;
  }

  const inputBottom = focusedInput.y + focusedInput.height;
  let adjustment = 0;

  if (inputBottom > visibleBottom) {
    adjustment = inputBottom - visibleBottom;
  } else if (focusedInput.y < visibleTop) {
    adjustment = focusedInput.y - visibleTop;
  }

  if (adjustment === 0) {
    return null;
  }

  return Math.max(0, currentOffsetY + adjustment);
}
