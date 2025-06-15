
"use client";

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ThemeProviderProps } from "next-themes/dist/types";
import type React from 'react';
import { createContext, useContext, useEffect, useState } from 'react';

// This is a wrapper around next-themes to fit the custom HTML structure if needed,
// but for now, next-themes handles most of it.
// The custom toggle logic from the HTML might need a separate component that uses `useTheme` from `next-themes`.

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Avoid hydration mismatch by rendering nothing or a loader on the server.
    // Or, ensure the initial theme is consistent. For now, returning children directly.
    // This ensures the theme is applied only on the client after mount.
     return <>{children}</>;
  }

  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}

    