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
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSubscription = Keyboard.addListener(showEvent, () => {
      setIsKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardVisible(false);
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
          isKeyboardVisible && styles.contentWithKeyboard
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
  },
  contentWithKeyboard: {
    paddingBottom: 24
  }
});
