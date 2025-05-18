// src/renderer/theme.tsx
import { createTheme, ThemeProvider } from '@mui/material/styles';
import React, { useMemo, useState } from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import IconButton from '@mui/material/IconButton';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';

export const ColorModeContext = React.createContext({ toggle: () => {} });

export default function AppTheme({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<'light'|'dark'>('dark');
  const colorMode = useMemo(
    () => ({ toggle: () => setMode(prev => (prev === 'light' ? 'dark' : 'light')) }),
    []
  );
  const theme = useMemo(
    () =>
      createTheme({
        palette: { mode },
        components: {
          MuiDrawer: {
            styleOverrides: {
              paper: { width: 300, borderRadius: '0 8px 8px 0' }
            }
          }
        }
      }),
    [mode]
  );
  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}
