"use client";

import { useCallback, useEffect, useState } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "agrogest-theme";

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.classList.toggle("dark", theme === "dark");
  localStorage.setItem(STORAGE_KEY, theme);
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const initial = getStoredTheme();
    applyTheme(initial);
    setTheme(initial);
    setMounted(true);
  }, []);

  const toggleTheme = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      const nextTheme: Theme = theme === "light" ? "dark" : "light";

      const x = event.clientX;
      const y = event.clientY;

      // Calculate hypotenuse to the farthest corner so the circle covers the entire viewport
      const endRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
      );

      // Use View Transition API if available
      if (document.startViewTransition) {
        const transition = document.startViewTransition(() => {
          applyTheme(nextTheme);
          setTheme(nextTheme);
        });

        transition.ready.then(() => {
          document.documentElement.animate(
            {
              clipPath: [
                `circle(0px at ${x}px ${y}px)`,
                `circle(${endRadius}px at ${x}px ${y}px)`
              ]
            },
            {
              duration: 500,
              easing: "ease-in-out",
              pseudoElement: "::view-transition-new(root)"
            }
          );
        });
      } else {
        applyTheme(nextTheme);
        setTheme(nextTheme);
      }
    },
    [theme]
  );

  return { theme, toggleTheme, mounted };
}
