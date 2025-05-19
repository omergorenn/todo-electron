"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/main/preload.ts
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    getTodos: () => electron_1.ipcRenderer.invoke('getTodos'),
    saveTodos: (data) => electron_1.ipcRenderer.invoke('saveTodos', data),
    hideWindow: () => electron_1.ipcRenderer.invoke('hide-window'),
    closeWindow: () => electron_1.ipcRenderer.invoke('close-window'),
    forceQuit: () => electron_1.ipcRenderer.invoke('force-quit'),
});
