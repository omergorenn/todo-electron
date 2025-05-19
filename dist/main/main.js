"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
let mainWindow = null;
let tray = null;
// Track active animation intervals so we can clear them on quit
let activeAnimations = [];
const PANEL_WIDTH = 280;
const PANEL_HEIGHT = 500;
const MARGIN = 10;
let visibleX;
let hiddenX;
let yPos;
// Path to your local todos.json
const todoFilePath = path_1.default.join(__dirname, '../../../data/todos.json');
// — IPC Handlers — 
electron_1.ipcMain.handle('getTodos', async () => {
    try {
        // Create data directory if it doesn't exist
        const dataDir = path_1.default.dirname(todoFilePath);
        if (!fs_1.default.existsSync(dataDir)) {
            fs_1.default.mkdirSync(dataDir, { recursive: true });
        }
        // If file exists, read and parse it
        if (fs_1.default.existsSync(todoFilePath)) {
            const raw = fs_1.default.readFileSync(todoFilePath, 'utf-8');
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
        }
        else {
            // Return empty data structure if file doesn't exist
            return {
                todos: [],
                sections: [
                    { id: 'today', name: 'Today', expanded: true },
                    { id: 'later', name: 'Later', expanded: true }
                ]
            };
        }
    }
    catch (error) {
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
electron_1.ipcMain.handle('saveTodos', async (_e, data) => {
    try {
        // Create data directory if it doesn't exist
        const dataDir = path_1.default.dirname(todoFilePath);
        if (!fs_1.default.existsSync(dataDir)) {
            fs_1.default.mkdirSync(dataDir, { recursive: true });
        }
        // Handle old format (just array of todos)
        if (Array.isArray(data)) {
            fs_1.default.writeFileSync(todoFilePath, JSON.stringify({ todos: data, sections: [] }, null, 2));
        }
        else {
            // Write new format (object with todos and sections)
            fs_1.default.writeFileSync(todoFilePath, JSON.stringify(data, null, 2));
        }
        return { success: true };
    }
    catch (error) {
        console.error('Error saving todos:', error);
        return { success: false };
    }
});
electron_1.ipcMain.handle('hide-window', () => {
    if (!mainWindow)
        return;
    animateWindow(visibleX, hiddenX, () => mainWindow?.hide());
});
electron_1.ipcMain.handle('close-window', () => {
    if (!mainWindow)
        return;
    animateWindow(visibleX, hiddenX, () => mainWindow?.destroy());
});
// — Animation Helper — 
function animateWindow(fromX, toX, onComplete) {
    if (!mainWindow)
        return;
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
        }
        catch (error) {
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
    const { workAreaSize } = electron_1.screen.getPrimaryDisplay();
    visibleX = workAreaSize.width - PANEL_WIDTH - MARGIN;
    hiddenX = workAreaSize.width + MARGIN;
    yPos = MARGIN;
    // Use a local const so TS knows it's not null
    const win = new electron_1.BrowserWindow({
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
            preload: path_1.default.join(__dirname, 'preload.js'),
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
    }
    else {
        win.loadFile(path_1.default.join(__dirname, '../renderer/index.html')).catch(error => {
            console.error('Failed to load HTML file:', error);
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
    const appRootPath = electron_1.app.getAppPath();
    console.log('App root path:', appRootPath);
    // Set up paths for both regular and fallback icons
    const iconName = process.platform === 'darwin' ? 'trayIconTemplate.png' : 'trayIcon.png';
    const iconPath = path_1.default.join(appRootPath, 'resources', iconName);
    const fallbackIconPath = path_1.default.join(appRootPath, 'resources', 'fallbackIcon.png');
    console.log('Looking for icon at:', iconPath);
    console.log('Fallback icon at:', fallbackIconPath);
    try {
        // First try to load the custom icon
        if (!fs_1.default.existsSync(iconPath)) {
            throw new Error(`Icon file not found at: ${iconPath}`);
        }
        // Create the icon from path
        const trayIcon = electron_1.nativeImage.createFromPath(iconPath);
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
            tray = new electron_1.Tray(resizedIcon);
        }
        else {
            tray = new electron_1.Tray(trayIcon);
        }
        console.log('Tray created successfully with custom icon');
    }
    catch (error) {
        // If custom icon fails, try the fallback
        console.error('Failed with custom icon:', error);
        console.log('Trying fallback icon instead');
        try {
            // Try fallback icon
            if (fs_1.default.existsSync(fallbackIconPath)) {
                const fallbackIcon = electron_1.nativeImage.createFromPath(fallbackIconPath);
                tray = new electron_1.Tray(fallbackIcon);
                console.log('Created tray with fallback icon');
            }
            else {
                // Last resort - create icon from inline data
                console.log('Fallback icon not found, creating from inline data');
                const iconData = 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAMNJREFUeNpi/P//PwMlgImBQjDwBrCgCxgbGzcDKQcgVmDEo3nv3r3tuOSZsAj2AukkIP5PpO5eZANYsAjmEqMZyM6FGcCCRdEBIt3XYGRktBCbF1iA+OpfCBBAjETG1tZVQKoLiO9TGoieQMwGxMbEGnAXiGWA+AEpBlwBYlkgfkiMF64DsQgQPyHFgKtALArET5ENANn8HYh1yE0HIEeJAfErdAMYgex0KJ9sADJgDhAfpHaGmoNsAECAAQC8qy19CBLzOwAAAABJRU5ErkJggg==';
                const fallbackIcon = electron_1.nativeImage.createFromDataURL(`data:image/png;base64,${iconData}`);
                tray = new electron_1.Tray(fallbackIcon);
                console.log('Created tray with inline fallback icon');
            }
        }
        catch (innerError) {
            console.error('Even fallback icon failed:', innerError);
            console.log('Creating empty icon as last resort');
            tray = new electron_1.Tray(electron_1.nativeImage.createEmpty());
        }
    }
    // Create the context menu (same regardless of icon)
    const contextMenu = electron_1.Menu.buildFromTemplate([
        {
            label: 'Show TODO Panel',
            click: () => {
                if (!mainWindow)
                    return;
                if (mainWindow.isDestroyed())
                    return;
                if (!mainWindow.isVisible()) {
                    mainWindow.show();
                    animateWindow(hiddenX, visibleX);
                }
            }
        },
        {
            label: 'Hide TODO Panel',
            click: () => {
                if (!mainWindow || mainWindow.isDestroyed() || !mainWindow.isVisible())
                    return;
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
            click: () => electron_1.app.quit()
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
        if (!mainWindow)
            return;
        if (mainWindow.isDestroyed())
            return;
        if (mainWindow.isVisible()) {
            animateWindow(visibleX, hiddenX, () => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.hide();
                }
            });
        }
        else {
            mainWindow.show();
            animateWindow(hiddenX, visibleX);
        }
    });
}
// — App Startup — 
electron_1.app.whenReady().then(() => {
    createWindow();
    createTray();
    // Register the toggle shortcut
    const registered = electron_1.globalShortcut.register('Command+`', () => {
        if (!mainWindow)
            return;
        if (mainWindow.isVisible()) {
            animateWindow(visibleX, hiddenX, () => mainWindow?.hide());
        }
        else {
            mainWindow.show();
            animateWindow(hiddenX, visibleX);
        }
    });
    console.log('Command+` registered:', registered);
});
// Quit when all windows are closed (except on macOS)
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin')
        electron_1.app.quit();
});
// Handle macOS activations
electron_1.app.on('activate', () => {
    if (electron_1.BrowserWindow.getAllWindows().length === 0)
        createWindow();
});
// Clean up
electron_1.app.on('will-quit', () => {
    // Clear all active animations
    activeAnimations.forEach(interval => clearInterval(interval));
    activeAnimations = [];
    // Unregister all shortcuts
    electron_1.globalShortcut.unregisterAll();
    // Clean up tray to prevent memory leak
    if (tray) {
        tray.destroy();
        tray = null;
    }
    // Reset main window reference
    mainWindow = null;
});
