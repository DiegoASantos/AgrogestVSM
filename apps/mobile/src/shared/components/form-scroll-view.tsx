import type { PropsWithChildren } from "react";
import { useEffect, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  type ScrollViewProps,
  StyleSheet
} from "react-native";

type FormScrollViewProps = PropsWithChildren<
  Omit<ScrollViewProps, "keyboardShouldPersistTaps">
>;

export function FormScrollView({ children, style, contentContainerStyle, ...scrollProps }: FormScrollViewProps) {
  const scrollRef = useRef<ScrollView>(null);
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSubscription = Keyboard.addListener(showEvent, (e) => {
      const height = e.endCoordinates.height;

      setKeyboardOffset(height);

      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 150);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardOffset(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.keyboardArea}
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          contentContainerStyle,
          keyboardOffset > 0 && { paddingBottom: keyboardOffset }
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={style}
        {...scrollProps}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardArea: {
    flex: 1
  }
});
