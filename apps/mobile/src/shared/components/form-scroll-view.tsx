import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  type PropsWithChildren
} from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  type ScrollViewProps,
  StyleSheet
} from "react-native";

import {
  getFormKeyboardAvoidingBehavior,
  scrollFocusedInputIntoView
} from "./form-scroll-view-keyboard";

type FormScrollViewProps = PropsWithChildren<
  Omit<ScrollViewProps, "keyboardShouldPersistTaps">
>;

export const FormScrollView = forwardRef<ScrollView, FormScrollViewProps>(
  function FormScrollView(
    { children, style, contentContainerStyle, onFocus, ...scrollProps },
    forwardedRef
  ) {
    const scrollRef = useRef<ScrollView>(null);
    const focusedTargetRef = useRef<unknown>(null);
    const scrollAnimationRef = useRef<number | null>(null);

    useImperativeHandle(forwardedRef, () => scrollRef.current as ScrollView);

    const scheduleFocusedInputScroll = useCallback((target: unknown) => {
      focusedTargetRef.current = target;

      if (scrollAnimationRef.current !== null) {
        cancelAnimationFrame(scrollAnimationRef.current);
      }

      scrollAnimationRef.current = requestAnimationFrame(() => {
        scrollAnimationRef.current = null;
        scrollFocusedInputIntoView(scrollRef.current, focusedTargetRef.current);
      });
    }, []);

    useEffect(() => {
      const keyboardSubscription = Keyboard.addListener("keyboardDidShow", () => {
        scheduleFocusedInputScroll(focusedTargetRef.current);
      });

      return () => {
        keyboardSubscription.remove();

        if (scrollAnimationRef.current !== null) {
          cancelAnimationFrame(scrollAnimationRef.current);
        }
      };
    }, [scheduleFocusedInputScroll]);

    const handleFocus: NonNullable<ScrollViewProps["onFocus"]> = (event) => {
      focusedTargetRef.current = event.target;
      onFocus?.(event);

      if (Keyboard.isVisible()) {
        scheduleFocusedInputScroll(event.target);
      }
    };

    return (
      <KeyboardAvoidingView
        behavior={getFormKeyboardAvoidingBehavior(Platform.OS)}
        style={styles.keyboardArea}
      >
        <ScrollView
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={contentContainerStyle}
          keyboardShouldPersistTaps="handled"
          onFocus={handleFocus}
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          style={style}
          {...scrollProps}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }
);

const styles = StyleSheet.create({
  keyboardArea: {
    flex: 1
  }
});
