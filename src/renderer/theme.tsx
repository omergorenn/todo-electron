// src/renderer/theme.tsx
import { createTheme, ThemeProvider } from '@mui/material/styles';
import React, { useMemo, useState, useEffect } from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, IconButton, useTheme } from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import WbSunnyRoundedIcon from '@mui/icons-material/WbSunnyRounded';
import NightsStayRoundedIcon from '@mui/icons-material/NightsStayRounded';

// Types for theme context
type ColorMode = 'light' | 'dark';
interface ColorModeContextType {
  mode: ColorMode;
  toggle: () => void;
  isDark: boolean;
}

export const ColorModeContext = React.createContext<ColorModeContextType>({ 
  mode: 'dark', 
  toggle: () => {}, 
  isDark: true 
});

// Theme toggle button component with animation
export function ThemeToggle() {
  const { mode, toggle } = React.useContext(ColorModeContext);
  const theme = useTheme();
  
  return (
    <IconButton 
      onClick={toggle}
      size="small"
      sx={{ 
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '50%',
        width: 32, 
        height: 32,
        transition: 'all 0.3s ease',
        background: mode === 'dark' 
          ? 'linear-gradient(135deg, #4b6cb7 0%, #182848 100%)' 
          : 'linear-gradient(135deg, #f5af19 0%, #f12711 100%)',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[4]
        }
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={mode}
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 30, opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: '#fff'
          }}
        >
          {mode === 'dark' 
            ? <NightsStayRoundedIcon sx={{ fontSize: 16 }} /> 
            : <WbSunnyRoundedIcon sx={{ fontSize: 16 }} />
          }
        </motion.div>
      </AnimatePresence>
    </IconButton>
  );
}

export default function AppTheme({ children }: { children: React.ReactNode }) {
  // Get initial theme from localStorage or system preference
  const getInitialMode = (): ColorMode => {
    const savedMode = localStorage.getItem('theme-mode');
    if (savedMode && (savedMode === 'light' || savedMode === 'dark')) {
      return savedMode;
    }
    // Check system preference as fallback
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  const [mode, setMode] = useState<ColorMode>(getInitialMode);
  
  // Update localStorage when theme changes
  useEffect(() => {
    localStorage.setItem('theme-mode', mode);
    // Optional: apply a class to the document for global styles
    document.documentElement.setAttribute('data-theme', mode);
  }, [mode]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      // Only update if user hasn't explicitly set a preference
      if (!localStorage.getItem('theme-mode')) {
        setMode(e.matches ? 'dark' : 'light');
      }
    };
    
    // Add event listener
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    
    // Fallback for Safari
    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  const colorMode = useMemo(
    () => ({ 
      mode,
      isDark: mode === 'dark',
      toggle: () => setMode(prev => (prev === 'light' ? 'dark' : 'light')) 
    }),
    [mode]
  );

  const theme = useMemo(
    () =>
      createTheme({
        palette: { 
          mode,
          primary: {
            main: mode === 'dark' ? '#90caf9' : '#1976d2',
          },
          secondary: {
            main: mode === 'dark' ? '#ce93d8' : '#9c27b0',
          },
          background: {
            default: mode === 'dark' ? '#121212' : '#f5f5f5',
            paper: mode === 'dark' ? '#1e1e1e' : '#ffffff',
          },
        },
        components: {
          MuiDrawer: {
            styleOverrides: {
              paper: { 
                width: 300, 
                borderRadius: '0 8px 8px 0',
                boxShadow: mode === 'dark' 
                  ? '0 0 15px rgba(0,0,0,0.5)' 
                  : '0 0 15px rgba(0,0,0,0.1)',
              }
            }
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                transition: 'background-color 0.3s ease-in-out'
              }
            }
          },
          MuiCssBaseline: {
            styleOverrides: {
              body: {
                transition: 'background-color 0.3s ease-in-out, color 0.3s ease-in-out',
                overscrollBehavior: 'none',
              },
            },
          },
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
