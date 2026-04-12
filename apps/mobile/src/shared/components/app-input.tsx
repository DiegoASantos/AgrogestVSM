import { StyleSheet, TextInput, View, type TextInputProps } from "react-native";

import { theme } from "../constants/theme";
import { AppText } from "./app-text";

type AppInputProps = TextInputProps & {
  label?: string;
  error?: string | null;
};

export function AppInput({ label, error, style, ...props }: AppInputProps) {
  return (
    <View style={styles.wrapper}>
      {label ? <AppText variant="label">{label}</AppText> : null}
      <TextInput
        placeholderTextColor={theme.colors.textMuted}
        style={[styles.input, error && styles.inputError, style]}
        {...props}
      />
      {error ? (
        <AppText style={styles.errorText} variant="caption">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 6
  },
  input: {
    minHeight: 48,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    fontSize: 15,
    color: theme.colors.text,
    backgroundColor: theme.colors.surfaceElevated
  },
  inputError: {
    borderColor: theme.colors.error,
    backgroundColor: theme.colors.errorMuted
  },
  errorText: {
    color: theme.colors.error
  }
});
