export const theme = {
  colors: {
    background: "#f0f4f0",
    surface: "#ffffff",
    surfaceElevated: "#fafcfa",
    primary: "#2d6a4f",
    primaryDark: "#1b4332",
    primaryMuted: "#d8f3dc",
    primaryLight: "#b7e4c7",
    text: "#1a1f1c",
    textMuted: "#6b7a6f",
    textInverse: "#ffffff",
    border: "#d0ddd4",
    borderLight: "#e8efe9",
    error: "#c0392b",
    errorMuted: "#fdecea",
    success: "#27ae60",
    successMuted: "#e8f8f0",
    warning: "#f39c12",
    warningMuted: "#fef9e7",
    info: "#2980b9",
    infoMuted: "#ebf5fb",
    shadow: "#1a1f1c"
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 40
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 999
  },
  shadow: {
    sm: {
      shadowColor: "#1a1f1c",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
      elevation: 2
    },
    md: {
      shadowColor: "#1a1f1c",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 4
    },
    lg: {
      shadowColor: "#1a1f1c",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 16,
      elevation: 8
    }
  }
} as const;
