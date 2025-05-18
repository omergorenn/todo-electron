"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
let mainWindow = null;
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
        const raw = fs_1.default.readFileSync(todoFilePath, 'utf-8');
        return JSON.parse(raw);
    }
    catch {
        return [];
    }
});
electron_1.ipcMain.handle('saveTodos', async (_e, todos) => {
    try {
        fs_1.default.writeFileSync(todoFilePath, JSON.stringify(todos, null, 2));
        return { success: true };
    }
    catch {
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
    const id = setInterval(() => {
        currentX += stepSize;
        mainWindow.setPosition(Math.round(currentX), yPos);
        if ((stepSize > 0 && currentX >= toX) || (stepSize < 0 && currentX <= toX)) {
            clearInterval(id);
            mainWindow.setPosition(toX, yPos);
            onComplete?.();
        }
    }, 10);
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
        win.loadURL('http://localhost:5173');
    }
    else {
        win.loadFile(path_1.default.join(__dirname, '../renderer/index.html'));
    }
    // Once ready, show and animate in
    win.once('ready-to-show', () => {
        win.show();
        animateWindow(hiddenX, visibleX);
    });
    // Override close to animate out instead of quitting
    win.on('close', (e) => {
        e.preventDefault();
        animateWindow(visibleX, hiddenX, () => win.hide());
    });
}
// — App Startup — 
electron_1.app.whenReady().then(() => {
    createWindow();
    // Register the toggle shortcut
    const registered = electron_1.globalShortcut.register('Control+Shift+T', () => {
        if (!mainWindow)
            return;
        if (mainWindow.isVisible()) {
            animateWindow(visibleX, hiddenX, () => mainWindow.hide());
        }
        else {
            mainWindow.show();
            animateWindow(hiddenX, visibleX);
        }
    });
    console.log('Ctrl+Shift+T registered:', registered);
});
// Quit when all windows are closed (except on macOS)
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin')
        electron_1.app.quit();
});
