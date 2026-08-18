import { forwardRef, type PropsWithChildren } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  type ScrollViewProps,
  StyleSheet
} from "react-native";

type FormScrollViewProps = PropsWithChildren<
  Omit<ScrollViewProps, "keyboardShouldPersistTaps">
>;

export const FormScrollView = forwardRef<ScrollView, FormScrollViewProps>(
  function FormScrollView(
    { children, style, contentContainerStyle, ...scrollProps },
    ref
  ) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardArea}
      >
        <ScrollView
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={contentContainerStyle}
          keyboardShouldPersistTaps="handled"
          ref={ref}
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
