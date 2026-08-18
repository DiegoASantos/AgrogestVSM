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
  getFocusedInputScrollOffset
} from "./form-scroll-view-keyboard";

type FormScrollViewProps = PropsWithChildren<
  Omit<ScrollViewProps, "keyboardShouldPersistTaps">
>;

type WindowMeasurable = {
  measureInWindow(
    callback: (x: number, y: number, width: number, height: number) => void
  ): void;
};

export const FormScrollView = forwardRef<ScrollView, FormScrollViewProps>(
  function FormScrollView(
    { children, style, contentContainerStyle, onFocus, onScroll, ...scrollProps },
    forwardedRef
  ) {
    const scrollRef = useRef<ScrollView>(null);
    const focusedTargetRef = useRef<WindowMeasurable | null>(null);
    const keyboardTopRef = useRef<number | null>(null);
    const scrollOffsetYRef = useRef(0);
    const scrollAnimationRef = useRef<number | null>(null);

    useImperativeHandle(forwardedRef, () => scrollRef.current as ScrollView);

    const scheduleFocusedInputScroll = useCallback((target: WindowMeasurable | null) => {
      focusedTargetRef.current = target;

      if (scrollAnimationRef.current !== null) {
        cancelAnimationFrame(scrollAnimationRef.current);
      }

      scrollAnimationRef.current = requestAnimationFrame(() => {
        scrollAnimationRef.current = null;

        const scrollView = scrollRef.current;
        const focusedTarget = focusedTargetRef.current;
        const keyboardTop = keyboardTopRef.current;

        if (scrollView === null || focusedTarget === null || keyboardTop === null) {
          return;
        }

        const nativeScrollView = scrollView.getNativeScrollRef();

        if (nativeScrollView === null) {
          return;
        }

        nativeScrollView.measureInWindow(
          (_scrollX, scrollY, _scrollWidth, scrollHeight) => {
            focusedTarget.measureInWindow((_inputX, inputY, _inputWidth, inputHeight) => {
              if (focusedTargetRef.current !== focusedTarget) {
                return;
              }

              const nextOffsetY = getFocusedInputScrollOffset({
                currentOffsetY: scrollOffsetYRef.current,
                scrollViewport: { y: scrollY, height: scrollHeight },
                focusedInput: { y: inputY, height: inputHeight },
                keyboardTop
              });

              if (nextOffsetY === null) {
                return;
              }

              scrollOffsetYRef.current = nextOffsetY;
              scrollView.scrollTo({ x: 0, y: nextOffsetY, animated: true });
            });
          }
        );
      });
    }, []);

    useEffect(() => {
      const showSubscription = Keyboard.addListener("keyboardDidShow", (event) => {
        keyboardTopRef.current = event.endCoordinates.screenY;
        scheduleFocusedInputScroll(focusedTargetRef.current);
      });
      const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
        keyboardTopRef.current = null;
      });

      return () => {
        showSubscription.remove();
        hideSubscription.remove();

        if (scrollAnimationRef.current !== null) {
          cancelAnimationFrame(scrollAnimationRef.current);
        }
      };
    }, [scheduleFocusedInputScroll]);

    const handleFocus: NonNullable<ScrollViewProps["onFocus"]> = (event) => {
      const focusedTarget = event.target;
      focusedTargetRef.current = focusedTarget;
      onFocus?.(event);

      if (Keyboard.isVisible()) {
        keyboardTopRef.current = Keyboard.metrics()?.screenY ?? keyboardTopRef.current;
        scheduleFocusedInputScroll(focusedTarget);
      }
    };

    const handleScroll: NonNullable<ScrollViewProps["onScroll"]> = (event) => {
      scrollOffsetYRef.current = event.nativeEvent.contentOffset.y;
      onScroll?.(event);
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
          onScroll={handleScroll}
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
