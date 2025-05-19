import { app, BrowserWindow, globalShortcut, ipcMain, screen, Tray, Menu, nativeImage } from 'electron';
import fs from 'fs';
import path from 'path';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
// Track active animation intervals so we can clear them on quit
let activeAnimations: NodeJS.Timeout[] = [];

const PANEL_WIDTH = 280;
const PANEL_HEIGHT = 500;
const MARGIN = 10;

let visibleX: number;
let hiddenX: number;
let yPos: number;

// Path to your local todos.json
const todoFilePath = path.join(__dirname, '../../../data/todos.json');

// — IPC Handlers — 
ipcMain.handle('getTodos', async () => {
  try {
    // Create data directory if it doesn't exist
    const dataDir = path.dirname(todoFilePath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // If file exists, read and parse it
    if (fs.existsSync(todoFilePath)) {
      const raw = fs.readFileSync(todoFilePath, 'utf-8');
      const data = JSON.parse(raw);
      
      // Handle old format (array of todos)
      if (Array.isArray(data)) {
        return {
          todos: data,
          sections: [
            { id: 'today', name: 'Today', expanded: true },
            { id: 'later', name: 'Later', expanded: true }
          ]
        };
      }
      
      // Return new format (object with todos and sections)
      return data;
    } else {
      // Return empty data structure if file doesn't exist
      return {
        todos: [],
        sections: [
          { id: 'today', name: 'Today', expanded: true },
          { id: 'later', name: 'Later', expanded: true }
        ]
      };
    }
  } catch (error) {
    console.error('Error reading todos:', error);
    return {
      todos: [],
      sections: [
        { id: 'today', name: 'Today', expanded: true },
        { id: 'later', name: 'Later', expanded: true }
      ]
    };
  }
});

ipcMain.handle('saveTodos', async (_e, data: any) => {
  try {
    // Create data directory if it doesn't exist
    const dataDir = path.dirname(todoFilePath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Handle old format (just array of todos)
    if (Array.isArray(data)) {
      fs.writeFileSync(todoFilePath, JSON.stringify(
        { todos: data, sections: [] },
        null, 2
      ));
    } else {
      // Write new format (object with todos and sections)
      fs.writeFileSync(todoFilePath, JSON.stringify(data, null, 2));
    }
    return { success: true };
  } catch (error) {
    console.error('Error saving todos:', error);
    return { success: false };
  }
});

ipcMain.handle('hide-window', () => {
  if (!mainWindow) return;
  animateWindow(visibleX, hiddenX, () => mainWindow?.hide());
});

ipcMain.handle('close-window', () => {
  if (!mainWindow) return;
  animateWindow(visibleX, hiddenX, () => mainWindow?.destroy());
});

// — Animation Helper — 
function animateWindow(fromX: number, toX: number, onComplete?: () => void) {
  if (!mainWindow) return;
  
  const STEPS = 20;
  const stepSize = (toX - fromX) / STEPS;
  let currentX = fromX;
  let isDestroyed = false;
  
  const id = setInterval(() => {
    // Check if window is still valid
    if (!mainWindow || mainWindow.isDestroyed()) {
      clearInterval(id);
      isDestroyed = true;
      // Remove from active animations
      activeAnimations = activeAnimations.filter(interval => interval !== id);
      return;
    }
    
    currentX += stepSize;
    try {
      mainWindow.setPosition(Math.round(currentX), yPos);
      
      if ((stepSize > 0 && currentX >= toX) || (stepSize < 0 && currentX <= toX)) {
        clearInterval(id);
        // Remove from active animations
        activeAnimations = activeAnimations.filter(interval => interval !== id);
        
        if (!isDestroyed && mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.setPosition(toX, yPos);
        }
        if (onComplete && !isDestroyed) {
          onComplete();
        }
      }
    } catch (error) {
      // In case of error (like object destroyed), clear the interval
      clearInterval(id);
      // Remove from active animations
      activeAnimations = activeAnimations.filter(interval => interval !== id);
      console.error('Animation error:', error);
    }
  }, 10);
  
  // Add to active animations
  activeAnimations.push(id);
}

// — Window Creation — 
function createWindow() {
  const { workAreaSize } = screen.getPrimaryDisplay();
  visibleX = workAreaSize.width - PANEL_WIDTH - MARGIN;
  hiddenX  = workAreaSize.width + MARGIN;
  yPos     = MARGIN;

  // Use a local const so TS knows it's not null
  const win = new BrowserWindow({
    width: PANEL_WIDTH,
    height: PANEL_HEIGHT,
    x: hiddenX,
    y: yPos,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    movable: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
    },
  });

  mainWindow = win;

  // Load your UI
  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:5173').catch(error => {
      console.log('Failed to load URL 5173, trying 5174');
      win.loadURL('http://localhost:5174').catch(err => {
        console.error('Failed to load dev URLs:', err);
      });
    });
  } else {
    // Improved path resolution for production
    const rendererPath = path.join(__dirname, '..', 'renderer', 'index.html');
    console.log('Loading renderer from:', rendererPath);
    
    win.loadFile(rendererPath).catch(error => {
      console.error('Failed to load HTML file:', error);
      
      // Fallback paths - try alternative locations
      const alternatives = [
        path.join(__dirname, '../renderer/index.html'),
        path.join(app.getAppPath(), 'dist/renderer/index.html'),
        path.join(process.resourcesPath, 'dist/renderer/index.html')
      ];
      
      console.log('Trying alternative paths:', alternatives);
      
      // Try each alternative path
      const tryLoadAlternative = (paths: string[], index = 0) => {
        if (index >= paths.length) {
          console.error('All loading attempts failed');
          return;
        }
        
        const currentPath = paths[index];
        console.log(`Trying path (${index+1}/${paths.length}):`, currentPath);
        
        if (fs.existsSync(currentPath)) {
          console.log('File exists, attempting to load:', currentPath);
          win.loadFile(currentPath).catch(err => {
            console.error(`Failed to load alternative path ${index+1}:`, err);
            tryLoadAlternative(paths, index + 1);
          });
        } else {
          console.log('File does not exist:', currentPath);
          tryLoadAlternative(paths, index + 1);
        }
      };
      
      tryLoadAlternative(alternatives);
    });
  }

  // Once ready, show and animate in
  win.once('ready-to-show', () => {
    if (!win.isDestroyed()) {
      win.show();
      animateWindow(hiddenX, visibleX);
    }
  });

  // Override close to animate out instead of quitting
  win.on('close', (e) => {
    // Prevent the default close behavior
    if (!win.isDestroyed()) {
      e.preventDefault();
      animateWindow(visibleX, hiddenX, () => {
        if (win && !win.isDestroyed()) {
          win.hide();
        }
      });
    }
  });
  
  // When window is closed, cleanup references
  win.on('closed', () => {
    mainWindow = null;
  });
}

// Create tray icon
function createTray() {
  console.log('Creating tray icon...');
  
  // Get the app root path
  const appRootPath = app.getAppPath();
  console.log('App root path:', appRootPath);
  
  // Set up paths for both regular and fallback icons
  const iconName = process.platform === 'darwin' ? 'trayIconTemplate.png' : 'trayIcon.png';
  const iconPath = path.join(appRootPath, 'resources', iconName);
  const fallbackIconPath = path.join(appRootPath, 'resources', 'fallbackIcon.png');
  
  console.log('Looking for icon at:', iconPath);
  console.log('Fallback icon at:', fallbackIconPath);

  try {
    // First try to load the custom icon
    if (!fs.existsSync(iconPath)) {
      throw new Error(`Icon file not found at: ${iconPath}`);
    }
    
    // Create the icon from path
    const trayIcon = nativeImage.createFromPath(iconPath);
    
    // Check if icon loaded correctly
    if (trayIcon.isEmpty()) {
      throw new Error('Custom icon is empty, will try fallback');
    }
    
    // Get size for logging
    const size = trayIcon.getSize();
    console.log('Icon loaded successfully, size:', size.width, 'x', size.height);
    
    // On macOS, check if we need to resize
    if (process.platform === 'darwin' && (size.width > 32 || size.height > 32)) {
      console.log('Resizing icon to 16x16 for macOS menu bar');
      const resizedIcon = trayIcon.resize({ width: 16, height: 16 });
      tray = new Tray(resizedIcon);
    } else {
      tray = new Tray(trayIcon);
    }
    
    console.log('Tray created successfully with custom icon');
  } catch (error) {
    // If custom icon fails, try the fallback
    console.error('Failed with custom icon:', error);
    console.log('Trying fallback icon instead');
    
    try {
      // Try fallback icon
      if (fs.existsSync(fallbackIconPath)) {
        const fallbackIcon = nativeImage.createFromPath(fallbackIconPath);
        tray = new Tray(fallbackIcon);
        console.log('Created tray with fallback icon');
      } else {
        // Last resort - create icon from inline data
        console.log('Fallback icon not found, creating from inline data');
        const iconData = 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAMNJREFUeNpi/P//PwMlgImBQjDwBrCgCxgbGzcDKQcgVmDEo3nv3r3tuOSZsAj2AukkIP5PpO5eZANYsAjmEqMZyM6FGcCCRdEBIt3XYGRktBCbF1iA+OpfCBBAjETG1tZVQKoLiO9TGoieQMwGxMbEGnAXiGWA+AEpBlwBYlkgfkiMF64DsQgQPyHFgKtALArET5ENANn8HYh1yE0HIEeJAfErdAMYgex0KJ9sADJgDhAfpHaGmoNsAECAAQC8qy19CBLzOwAAAABJRU5ErkJggg==';
        const fallbackIcon = nativeImage.createFromDataURL(`data:image/png;base64,${iconData}`);
        tray = new Tray(fallbackIcon);
        console.log('Created tray with inline fallback icon');
      }
    } catch (innerError) {
      console.error('Even fallback icon failed:', innerError);
      console.log('Creating empty icon as last resort');
      tray = new Tray(nativeImage.createEmpty());
    }
  }
  
  // Create the context menu (same regardless of icon)
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show TODO Panel',
      click: () => {
        if (!mainWindow) return;
        if (mainWindow.isDestroyed()) return;
        
        if (!mainWindow.isVisible()) {
          mainWindow.show();
          animateWindow(hiddenX, visibleX);
        }
      }
    },
    {
      label: 'Hide TODO Panel',
      click: () => {
        if (!mainWindow || mainWindow.isDestroyed() || !mainWindow.isVisible()) return;
        animateWindow(visibleX, hiddenX, () => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.hide();
          }
        });
      }
    },
    { type: 'separator' },
    {
      label: 'View on GitHub',
      click: () => {
        require('electron').shell.openExternal('https://github.com/omergorenn/todo-electron');
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        // Force quit the app completely
        try {
          console.log('Quit menu item clicked');
          
          // First clean up any references
          if (mainWindow) {
            console.log('Destroying main window');
            if (!mainWindow.isDestroyed()) {
              mainWindow.removeAllListeners(); // Remove all listeners first
              mainWindow.hide();
              mainWindow.destroy();
            }
            mainWindow = null;
          }
          
          // Clear all active animations
          console.log('Clearing all animations');
          activeAnimations.forEach(interval => clearInterval(interval));
          activeAnimations = [];
          
          // Unregister shortcuts
          console.log('Unregistering global shortcuts');
          globalShortcut.unregisterAll();
          
          // Clean up tray
          if (tray) {
            console.log('Destroying tray');
            tray.destroy();
            tray = null;
          }
          
          // Just use process.exit directly - most reliable way to quit
          console.log('Force exiting application');
          process.exit(0);
        } catch (error) {
          console.error('Error during quit:', error);
          // If anything fails, force exit
          process.exit(0);
        }
      }
    }
  ]);
  
  // Configure tray behavior
  if (process.platform === 'darwin') {
    tray.setTitle(''); // Empty title for macOS
  }
  
  tray.setToolTip('TODO App');
  tray.setContextMenu(contextMenu);
  
  // Toggle on click
  tray.on('click', () => {
    if (!mainWindow) return;
    if (mainWindow.isDestroyed()) return;
    
    if (mainWindow.isVisible()) {
      animateWindow(visibleX, hiddenX, () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.hide();
        }
      });
    } else {
      mainWindow.show();
      animateWindow(hiddenX, visibleX);
    }
  });
}

// — App Startup — 
app.whenReady().then(() => {
  createWindow();
  createTray();

  // Register the toggle shortcut
  const registered = globalShortcut.register('Command+`', () => {
    if (!mainWindow) return;
    if (mainWindow.isVisible()) {
      animateWindow(visibleX, hiddenX, () => mainWindow?.hide());
    } else {
      mainWindow.show();
      animateWindow(hiddenX, visibleX);
    }
  });
  console.log('Command+` registered:', registered);
  
  // Register standard quit shortcut (Cmd+Q on macOS, Ctrl+Q elsewhere)
  const quitKey = process.platform === 'darwin' ? 'Command+Q' : 'Control+Q';
  const quitRegistered = globalShortcut.register(quitKey, () => {
    console.log('Quit shortcut pressed');
    process.exit(0);  // Force quit the app
  });
  console.log(`${quitKey} registered:`, quitRegistered);
});

// Allow closing on Windows/Linux
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle macOS activations
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// Clean up
app.on('will-quit', (event) => {
  console.log('will-quit event fired');
  try {
    // Clear all active animations
    activeAnimations.forEach(interval => clearInterval(interval));
    activeAnimations = [];
    
    // Unregister all shortcuts
    globalShortcut.unregisterAll();
    
    // Clean up tray to prevent memory leak
    if (tray) {
      tray.destroy();
      tray = null;
    }
    
    // Ensure the window is destroyed
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.removeAllListeners();
      mainWindow.destroy();
    }
    
    // Reset main window reference
    mainWindow = null;
    
    console.log('Cleanup complete. Proceeding with quit.');
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
});

// Ensure we can force quit if needed
app.on('before-quit', (event) => {
  console.log('Before quit event fired');
  // Allow natural quit to proceed
});

// Add a special IPC handler for quitting
ipcMain.handle('force-quit', () => {
  console.log('Force quit requested via IPC');
  process.exit(0);
});
